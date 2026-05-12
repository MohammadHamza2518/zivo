'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff,
  Flag, Send, MessageSquare, X, Users, ChevronDown
} from 'lucide-react';
import ReportModal from '../../components/modals/ReportModal';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type Status = 'idle' | 'queued' | 'connected' | 'ended';
interface ChatMsg { text: string; from: 'me' | 'them'; ts: number; }

export default function ChatPage() {
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<Status>('idle');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [online, setOnline] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [camError, setCamError] = useState<'denied' | 'notfound' | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      setCamError(null);
      return stream;
    } catch (err: unknown) {
      const name = (err as { name?: string })?.name || '';
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setCamError('notfound');
      } else {
        setCamError('denied');
      }
      return null;
    }
  }, []);

  const buildPC = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    const remoteStream = new MediaStream();
    pc.ontrack = e => {
      e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    };

    pc.onicecandidate = e => {
      if (e.candidate && socketRef.current && roomIdRef.current) {
        socketRef.current.emit('ice-candidate', { roomId: roomIdRef.current, candidate: e.candidate });
      }
    };
    return pc;
  }, []);

  const cleanupPC = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    roomIdRef.current = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  }, []);

  const findMatch = useCallback((prefs = {}) => {
    cleanupPC();
    setStatus('queued');
    setMessages([]);
    setPeerTyping(false);
    socketRef.current?.emit('find-match', prefs);
  }, [cleanupPC]);

  const handleNext = useCallback(() => {
    cleanupPC();
    setStatus('queued');
    setMessages([]);
    setPeerTyping(false);
    socketRef.current?.emit('next');
  }, [cleanupPC]);

  const handleEnd = useCallback(() => {
    socketRef.current?.emit('leave');
    cleanupPC();
    setStatus('ended');
  }, [cleanupPC]);

  const sendMsg = useCallback(() => {
    const text = inputMsg.trim();
    if (!text || !roomIdRef.current) return;
    socketRef.current?.emit('chat-message', { roomId: roomIdRef.current, message: text });
    setMessages(prev => [...prev, { text, from: 'me', ts: Date.now() }]);
    setInputMsg('');
    socketRef.current?.emit('typing', { roomId: roomIdRef.current, isTyping: false });
  }, [inputMsg]);

  const handleTyping = useCallback((val: string) => {
    setInputMsg(val);
    if (!roomIdRef.current) return;
    socketRef.current?.emit('typing', { roomId: roomIdRef.current, isTyping: val.length > 0 });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomId: roomIdRef.current, isTyping: false });
    }, 2000);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('zivo-age-ok')) {
      router.push('/?warn=1');
      return;
    }

    const socket = io(BACKEND, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('online-count', (n: number) => setOnline(n));
    socket.on('queued', () => setStatus('queued'));

    socket.on('matched', async ({ roomId, isOfferer }: { roomId: string; isOfferer: boolean }) => {
      roomIdRef.current = roomId;
      setStatus('connected');
      setMessages([]);
      const pc = buildPC();
      if (isOfferer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      }
    });

    socket.on('offer', async ({ offer }: { offer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current || !roomIdRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit('answer', { roomId: roomIdRef.current, answer });
    });

    socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
    });

    socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try { await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
    });

    socket.on('peer-disconnected', () => {
      cleanupPC();
      setStatus('queued');
      setMessages([]);
      setPeerTyping(false);
      socket.emit('find-match', {});
    });

    socket.on('chat-message', ({ message, ts }: { message: string; ts: number }) => {
      setMessages(prev => [...prev, { text: message, from: 'them', ts }]);
      setUnread(n => n + 1);
    });

    socket.on('typing', ({ isTyping }: { isTyping: boolean }) => setPeerTyping(isTyping));
    socket.on('report-received', () => { setShowReport(false); handleNext(); });
    socket.on('kicked', () => {
      cleanupPC();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      socket.disconnect();
      router.push('/?warn=1');
    });

    getMedia().then(stream => { if (stream) findMatch({}); });

    return () => {
      socket.disconnect();
      cleanupPC();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (showChat) setUnread(0); }, [showChat]);

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) { t.enabled = !t.enabled; setMicOn(t.enabled); }
  };
  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) { t.enabled = !t.enabled; setCamOn(t.enabled); }
  };
  const handleReport = (reason: string) => { socketRef.current?.emit('report', { reason }); };

  // ── PiP position: above controls bar (68px) + small gap
  const pipBottom = isMobile ? 80 : 88;
  const pipRight = 10;
  const pipWidth = isMobile ? 90 : 140;

  return (
    <>
      {/* ── Camera Permission Error Screen ─────────────────── */}
      {camError && (
        <div style={{
          height: '100dvh', background: '#08080f', display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 28, textAlign: 'center', gap: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: camError === 'notfound' ? 'rgba(251,191,36,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${camError === 'notfound' ? 'rgba(251,191,36,0.2)' : 'rgba(239,68,68,0.2)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, marginBottom: 20,
          }}>
            {camError === 'notfound' ? '🎥' : '🔒'}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>
            {camError === 'notfound' ? 'No Camera Found' : 'Camera Access Blocked'}
          </h1>
          <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.7, maxWidth: 340, marginBottom: 28 }}>
            {camError === 'notfound'
              ? 'No camera or microphone detected on this device. Please plug in a camera and try again.'
              : 'Zivo needs your camera and microphone to connect you with people. Chrome is currently blocking access.'
            }
          </p>

          {/* Steps */}
          {camError === 'denied' && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '16px 20px', marginBottom: 24,
              textAlign: 'left', maxWidth: 340, width: '100%',
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', marginBottom: 12 }}>
                HOW TO FIX IN CHROME
              </p>
              {[
                '🔒  Click the lock icon in the address bar',
                '🎥  Set Camera → Allow',
                '🎤  Set Microphone → Allow',
                '🔄  Refresh this page',
              ].map((step, i) => (
                <p key={i} style={{ fontSize: 13, color: '#64748b', marginBottom: 6, lineHeight: 1.5 }}>{step}</p>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={() => getMedia().then(s => { if (s) findMatch({}); })}
              style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg,#7c3aed,#2563eb)',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}
            >
              🔄 Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 20px', borderRadius: 12,
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: '#64748b', fontSize: 14, cursor: 'pointer',
              }}
            >
              ← Go Home
            </button>
          </div>
        </div>
      )}

      {!camError && (
    <>
      {/* ── Inline responsive styles ──────────────────── */}
      <style>{`
        .chat-panel-desktop {
          width: 300px; flex-shrink: 0;
          background: rgba(13,13,20,0.98);
          border-left: 1px solid rgba(255,255,255,0.07);
          display: flex; flex-direction: column;
        }
        @media (max-width: 640px) {
          .chat-panel-desktop {
            position: fixed !important;
            bottom: 0; left: 0; right: 0;
            width: 100% !important; height: 65dvh;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px 20px 0 0; z-index: 30;
          }
        }

        /* ── Controls bar ─────────────────────── */
        .controls-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          padding-bottom: max(10px, env(safe-area-inset-bottom));
          background: rgba(8,8,14,0.98);
          border-top: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }

        /* Pill wrapper around the icon buttons */
        .ctrl-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 6px 8px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Icon button inside pill */
        .cb {
          position: relative;
          width: 44px; height: 44px;
          border-radius: 14px; border: none;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          cursor: pointer; flex-shrink: 0;
          transition: background 0.15s, transform 0.12s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .cb:active { transform: scale(0.91); }
        .cb:disabled { opacity: 0.3; cursor: not-allowed; }
        .cb-label {
          font-size: 9px; font-weight: 600; letter-spacing: 0.02em;
          line-height: 1; color: inherit; opacity: 0.7;
        }

        /* States */
        .cb-default { background: rgba(255,255,255,0.06); color: #94a3b8; }
        .cb-default:hover { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .cb-active { background: rgba(139,92,246,0.18); color: #a78bfa; border: 1px solid rgba(139,92,246,0.25); }
        .cb-muted { background: rgba(239,68,68,0.12); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }

        /* Next button — standalone gradient pill */
        .cb-next {
          display: flex; align-items: center; gap: 8px;
          height: 44px; padding: 0 20px;
          border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: #fff; font-size: 14px; font-weight: 700;
          cursor: pointer; flex-shrink: 0;
          transition: transform 0.15s, box-shadow 0.15s, opacity 0.15s;
          font-family: 'Inter', system-ui, sans-serif;
          letter-spacing: 0.01em;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 4px 20px rgba(124,58,237,0.35);
        }
        .cb-next:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(124,58,237,0.5); }
        .cb-next:active { transform: scale(0.95); }

        /* End button — solid red */
        .cb-end {
          width: 44px; height: 44px; border-radius: 14px; border: none;
          background: #dc2626;
          color: #fff; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s, transform 0.12s;
          box-shadow: 0 4px 16px rgba(220,38,38,0.3);
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .cb-end:hover { background: #ef4444; }
        .cb-end:active { transform: scale(0.91); }

        @media (max-width: 480px) {
          .ctrl-pill { gap: 4px; padding: 5px 6px; }
          .cb { width: 46px; height: 46px; }
          .cb-next { height: 46px; padding: 0 16px; }
          .cb-next .next-label { display: none; }
          .cb-end { width: 46px; height: 46px; }
        }
      `}</style>

      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0f', overflow: 'hidden' }}>
        <ReportModal isOpen={showReport} onClose={() => setShowReport(false)} onReport={handleReport} />

        {/* ── Top bar ──────────────────────────────────── */}
        <div style={{
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 14px', background: 'rgba(17,17,24,0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Zivo
            </span>
            <span style={{
              fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 600,
              background: status === 'connected' ? 'rgba(74,222,128,0.1)' : 'rgba(139,92,246,0.1)',
              color: status === 'connected' ? '#4ade80' : '#a78bfa',
              border: `1px solid ${status === 'connected' ? 'rgba(74,222,128,0.25)' : 'rgba(139,92,246,0.25)'}`,
            }}>
              {status === 'connected' ? '● Live' : status === 'queued' ? '⟳ Finding...' : 'Ready'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={13} color="#475569" />
              {online > 0 ? online.toLocaleString() : '—'}
            </span>
            <button onClick={() => router.push('/')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#475569', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Main content area ─────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

          {/* Video area */}
          <div style={{ flex: 1, position: 'relative', background: '#050508' }}>

            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }}
            />

            {/* Waiting / ended overlay */}
            {status !== 'connected' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
                {status === 'queued' && (
                  <>
                    {/* Animated ring */}
                    <div style={{ position: 'relative', width: 72, height: 72 }}>
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.15)' }} />
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                      <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 1.5s linear infinite reverse' }} />
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, textAlign: 'center' }}>Looking for someone…</p>
                    <p style={{ color: '#334155', fontSize: 13, textAlign: 'center' }}>This usually takes a few seconds</p>
                  </>
                )}
                {status === 'ended' && (
                  <>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PhoneOff size={24} color="#ef4444" />
                    </div>
                    <p style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600 }}>Chat ended</p>
                    <button onClick={() => findMatch({})} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 14, fontSize: 14, fontWeight: 700 }}>
                      <SkipForward size={16} /> Find New Person
                    </button>
                  </>
                )}
                {status === 'idle' && (
                  <p style={{ color: '#334155', fontSize: 14 }}>Initialising camera…</p>
                )}
              </div>
            )}

            {/* Local PiP video */}
            <div style={{
              position: 'absolute', bottom: pipBottom, right: pipRight,
              width: pipWidth, aspectRatio: '4/3',
              borderRadius: 12, overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.12)',
              background: '#0a0a0f',
              boxShadow: '0 6px 24px rgba(0,0,0,0.6)',
              zIndex: 6,
            }}>
              <video ref={localVideoRef} autoPlay muted playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
              {!camOn && (
                <div style={{ position: 'absolute', inset: 0, background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <VideoOff size={isMobile ? 14 : 18} color="#334155" />
                </div>
              )}
            </div>

            {/* Typing indicator overlay */}
            {peerTyping && status === 'connected' && (
              <div style={{ position: 'absolute', bottom: pipBottom, left: 10, padding: '5px 12px', borderRadius: 99, background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', gap: 5, zIndex: 6 }}>
                <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                <span style={{ fontSize: 11, color: '#475569', marginLeft: 3 }}>typing…</span>
              </div>
            )}

            {/* Unread badge over video (mobile, when chat closed) */}
            {unread > 0 && !showChat && isMobile && (
              <button onClick={() => setShowChat(true)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 6, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99, background: 'rgba(139,92,246,0.9)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <MessageSquare size={14} /> {unread} new
              </button>
            )}
          </div>

          {/* ── Chat panel (desktop: sidebar | mobile: bottom sheet) ─────── */}
          {showChat && (
            <>
              {/* Mobile backdrop */}
              {isMobile && (
                <div onClick={() => setShowChat(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 29, backdropFilter: 'blur(4px)' }} />
              )}
              <div className="chat-panel-desktop">
                {/* Header */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>💬 Chat</span>
                  <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: '#475569', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                    <ChevronDown size={16} />
                  </button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.length === 0 && (
                    <p style={{ color: '#1e293b', fontSize: 13, textAlign: 'center', marginTop: 24 }}>Say hello 👋</p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
                      <span style={{
                        maxWidth: '78%', padding: '8px 12px', wordBreak: 'break-word',
                        borderRadius: m.from === 'me' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: m.from === 'me' ? 'linear-gradient(135deg,#8b5cf6,#3b82f6)' : 'rgba(255,255,255,0.08)',
                        fontSize: 13, lineHeight: 1.5, color: '#f1f5f9',
                      }}>
                        {m.text}
                      </span>
                    </div>
                  ))}
                  {peerTyping && (
                    <div style={{ display: 'flex', gap: 4, paddingLeft: 6 }}>
                      <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: '10px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 8, flexShrink: 0 }}>
                  <input
                    value={inputMsg}
                    onChange={e => handleTyping(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMsg()}
                    placeholder={status === 'connected' ? 'Type a message…' : 'Connect first…'}
                    disabled={status !== 'connected'}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: '#f1f5f9', fontSize: 14, outline: 'none' }}
                  />
                  <button onClick={sendMsg} disabled={!inputMsg.trim() || status !== 'connected'}
                    style={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer', opacity: inputMsg.trim() && status === 'connected' ? 1 : 0.35, flexShrink: 0 }}>
                    <Send size={16} color="#fff" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Controls bar ─────────────────────────────── */}
        <div className="controls-bar">

          {/* Left pill — mic + cam + chat */}
          <div className="ctrl-pill">

            {/* Mic */}
            <button
              className={`cb ${micOn ? 'cb-default' : 'cb-muted'}`}
              onClick={toggleMic}
              title={micOn ? 'Mute mic' : 'Unmute mic'}
            >
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              <span className="cb-label">{micOn ? 'Mic' : 'Muted'}</span>
            </button>

            {/* Camera */}
            <button
              className={`cb ${camOn ? 'cb-default' : 'cb-muted'}`}
              onClick={toggleCam}
              title={camOn ? 'Turn off camera' : 'Turn on camera'}
            >
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
              <span className="cb-label">{camOn ? 'Cam' : 'Off'}</span>
            </button>

            {/* Chat */}
            <button
              className={`cb ${showChat ? 'cb-active' : 'cb-default'}`}
              onClick={() => setShowChat(s => !s)}
              title="Text chat"
            >
              <MessageSquare size={18} />
              <span className="cb-label">Chat</span>
              {unread > 0 && !showChat && (
                <span style={{
                  position: 'absolute', top: 3, right: 3,
                  minWidth: 16, height: 16, borderRadius: 99,
                  background: '#8b5cf6', fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', padding: '0 3px',
                }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          </div>

          {/* Next — primary CTA */}
          <button className="cb-next" onClick={handleNext} title="Next stranger">
            <SkipForward size={18} />
            <span className="next-label">Next</span>
          </button>

          {/* End — solid red */}
          <button className="cb-end" onClick={handleEnd} title="End chat">
            <PhoneOff size={19} />
          </button>

          {/* Report — subtle */}
          <button
            className="cb cb-default"
            onClick={() => setShowReport(true)}
            title="Report user"
            disabled={status !== 'connected'}
          >
            <Flag size={16} />
            <span className="cb-label">Report</span>
          </button>

        </div>
      </div>
      </>
      )}
    </>
  );
}
