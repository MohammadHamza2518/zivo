'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Logo from '../../components/Logo';
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff,
  Flag, Send, MessageSquare, X, Users, ChevronDown, Disc
} from 'lucide-react';
import ReportModal from '../../components/modals/ReportModal';

const AI_PROMPTS = [
  "🤖 AI Co-Pilot: Ask them what's the wildest thing they've done for money! 💸",
  "🤖 AI Co-Pilot: Awkward silence detected! Quick, ask them about their worst date ever! 💔",
  "🤖 AI Co-Pilot: Play Two Truths and a Lie! Go first! 🤥",
  "🤖 AI Co-Pilot: Ask them if they believe in aliens, and why the answer is yes. 👽",
  "🤖 AI Co-Pilot: Silence! Ask them what their last Google search was... be honest! 🔍",
  "🤖 AI Co-Pilot: Ask them: Pineapple on pizza, yes or murder? 🍕🍍",
  "🤖 AI Co-Pilot: Icebreaker time: What's their most embarrassing guilty pleasure song? 🎶",
  "🤖 AI Co-Pilot: Quick, ask them what they'd do in a zombie apocalypse right now! 🧟‍♂️",
  "🤖 AI Co-Pilot: Ask them for their most controversial food opinion. 🍔",
  "🤖 AI Co-Pilot: Plot twist: Ask them what conspiracy theory they low-key believe in. 🕵️"
];

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

type Status = 'idle' | 'queued' | 'connected' | 'ended';
interface ChatMsg { text: string; from: 'me' | 'them' | 'ai'; ts: number; }

export default function ChatPage() {
  const router = useRouter();

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const localRafRef = useRef<number | null>(null);
  const remoteRafRef = useRef<number | null>(null);

  // Recording refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordRafRef = useRef<number | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const localAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const remoteAudioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

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
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const startAudioMonitor = useCallback((stream: MediaStream, setSpeaking: React.Dispatch<React.SetStateAction<boolean>>, rafRef: React.MutableRefObject<number | null>) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVol = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
        const avg = sum / dataArray.length;
        
        // Increased threshold from 15 to 35 to prevent background noise from triggering it
        setSpeaking(avg > 35);

        rafRef.current = requestAnimationFrame(checkVol);
      };

      checkVol();
    } catch (e) {
      console.log('Audio monitor error:', e);
    }
  }, []);

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
      if (localRafRef.current) cancelAnimationFrame(localRafRef.current);
      startAudioMonitor(stream, setLocalSpeaking, localRafRef);
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
    remoteStreamRef.current = remoteStream;
    pc.ontrack = e => {
      e.streams[0].getTracks().forEach(t => {
        if (!remoteStream.getTracks().includes(t)) remoteStream.addTrack(t);
      });
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStream) {
         remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteRafRef.current) cancelAnimationFrame(remoteRafRef.current);
      startAudioMonitor(remoteStream, setRemoteSpeaking, remoteRafRef);
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
    if (remoteRafRef.current) { cancelAnimationFrame(remoteRafRef.current); remoteRafRef.current = null; }
    setRemoteSpeaking(false);
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
      if (localRafRef.current) cancelAnimationFrame(localRafRef.current);
      if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI Co-Pilot Awkward Silence Detector
  useEffect(() => {
    if (status !== 'connected') return;
    
    // If there is any speaking or typing, do not trigger AI
    if (localSpeaking || remoteSpeaking || peerTyping) return;

    // Check if the last message was already an AI prompt to prevent spamming
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && lastMsg.from === 'ai') return;

    const timer = setTimeout(() => {
      const prompt = AI_PROMPTS[Math.floor(Math.random() * AI_PROMPTS.length)];
      setMessages(prev => [...prev, { text: prompt, from: 'ai', ts: Date.now() }]);
      setUnread(n => n + 1);
      // We don't auto-open chat so it doesn't scare them, but they see the badge
    }, 15000); // 15 seconds of pure silence

    return () => clearTimeout(timer);
  }, [localSpeaking, remoteSpeaking, peerTyping, status, messages]);

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

  // --- Recording Logic ---
  const startRecording = () => {
    if (!localVideoRef.current || !remoteVideoRef.current) return;
    if (!localStreamRef.current || !remoteStreamRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920; // 9:16 aspect ratio
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const logoImg = new Image();
    logoImg.src = '/zivo-logo-final.png';

    // 1. Audio Mixing
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ac = audioContextRef.current;
    if (ac.state === 'suspended') ac.resume();

    const dest = ac.createMediaStreamDestination();
    audioDestRef.current = dest;

    // Connect local audio
    const localAudioTrack = localStreamRef.current.getAudioTracks()[0];
    if (localAudioTrack) {
      const localAudioStream = new MediaStream([localAudioTrack]);
      const localSource = ac.createMediaStreamSource(localAudioStream);
      localSource.connect(dest);
      localAudioSourceRef.current = localSource;
    }

    // Connect remote audio
    const remoteAudioTrack = remoteStreamRef.current.getAudioTracks()[0];
    if (remoteAudioTrack) {
      const remoteAudioStream = new MediaStream([remoteAudioTrack]);
      const remoteSource = ac.createMediaStreamSource(remoteAudioStream);
      remoteSource.connect(dest);
      remoteAudioSourceRef.current = remoteSource;
    }

    // 2. Video Drawing Loop
    const drawFrame = () => {
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Remote Video (Top half)
      if (remoteVideoRef.current && remoteVideoRef.current.readyState >= 2) {
        const sAspectRatio = remoteVideoRef.current.videoWidth / remoteVideoRef.current.videoHeight;
        const dAspectRatio = 1080 / 960;
        let sx = 0, sy = 0, sWidth = remoteVideoRef.current.videoWidth, sHeight = remoteVideoRef.current.videoHeight;
        if (sAspectRatio > dAspectRatio) {
          sWidth = sHeight * dAspectRatio;
          sx = (remoteVideoRef.current.videoWidth - sWidth) / 2;
        } else {
          sHeight = sWidth / dAspectRatio;
          sy = (remoteVideoRef.current.videoHeight - sHeight) / 2;
        }
        ctx.drawImage(remoteVideoRef.current, sx, sy, sWidth, sHeight, 0, 0, 1080, 960);
      }

      // Draw Local Video (Bottom half)
      if (localVideoRef.current && localVideoRef.current.readyState >= 2) {
        ctx.save();
        ctx.translate(1080, 960);
        ctx.scale(-1, 1);
        const sAspectRatio = localVideoRef.current.videoWidth / localVideoRef.current.videoHeight;
        const dAspectRatio = 1080 / 960;
        let sx = 0, sy = 0, sWidth = localVideoRef.current.videoWidth, sHeight = localVideoRef.current.videoHeight;
        if (sAspectRatio > dAspectRatio) {
          sWidth = sHeight * dAspectRatio;
          sx = (localVideoRef.current.videoWidth - sWidth) / 2;
        } else {
          sHeight = sWidth / dAspectRatio;
          sy = (localVideoRef.current.videoHeight - sHeight) / 2;
        }
        ctx.drawImage(localVideoRef.current, sx, sy, sWidth, sHeight, 0, 0, 1080, 960);
        ctx.restore();
      }

      // Draw Watermark (Centered & Transparent)
      if (logoImg.complete && logoImg.naturalHeight > 0) {
        const logoHeight = 85; // Slightly smaller for less distraction
        const logoWidth = (logoImg.naturalWidth / logoImg.naturalHeight) * logoHeight;
        
        // Centered position (Middle of the whole clip, between the two videos)
        const x = (canvas.width - logoWidth) / 2;
        const y = (canvas.height - logoHeight) / 2;

        ctx.save();
        
        // 1. Subtle Glow for visibility against any background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 15;
        
        // 2. Transparency (Watermark effect)
        ctx.globalAlpha = 0.6; // 60% opacity so it's not too "loud"
        
        // 3. Draw the Logo
        ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);

        ctx.restore();
      }

      recordRafRef.current = requestAnimationFrame(drawFrame);
    };
    drawFrame();

    // 3. Combine Streams
    const canvasStream = canvas.captureStream(30);
    const mixedAudioTracks = dest.stream.getAudioTracks();
    mixedAudioTracks.forEach(t => canvasStream.addTrack(t));

    // 4. Start MediaRecorder
    try {
      const options = { mimeType: 'video/webm' };
      const recorder = new MediaRecorder(canvasStream, options);
      
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `zivotalk-clip-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        recordedChunksRef.current = [];
        
        if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
    } catch (e) {
      console.error('Error starting MediaRecorder', e);
      setIsRecording(false);
      if (recordRafRef.current) cancelAnimationFrame(recordRafRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (localAudioSourceRef.current) {
      localAudioSourceRef.current.disconnect();
      localAudioSourceRef.current = null;
    }
    if (remoteAudioSourceRef.current) {
      remoteAudioSourceRef.current.disconnect();
      remoteAudioSourceRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  // Removed PiP variables since we are switching to an Omegle-style split-screen layout

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
              : 'Zivo Talk needs your camera and microphone to connect you with people. Chrome is currently blocking access.'
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
        .video-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 8px;
          background: #050508;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .video-wrapper {
            flex-direction: row;
            gap: 16px;
            padding: 16px;
          }
        }
        
        .video-box {
          flex: 1;
          position: relative;
          background: #121218;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.04);
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          transition: all 0.2s ease-out;
        }

        .video-box.speaking-remote {
          border-color: #10b981;
          box-shadow: 0 0 0 2px #10b981, 0 0 32px rgba(16,185,129,0.3);
        }

        .video-box.speaking-local {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px #3b82f6, 0 0 32px rgba(59,130,246,0.3);
        }

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

        /* Record button animation */
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .cb-record { background: rgba(255,255,255,0.06); color: #94a3b8; }
        .cb-record:hover { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .cb-record.recording {
          background: rgba(239,68,68,0.15);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.3);
          animation: pulse-red 2s infinite;
        }

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
            <Logo height={42} showText={false} />
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
          <div className="video-wrapper">

            {/* Remote / Stranger container */}
            <div className={`video-box ${remoteSpeaking && status === 'connected' ? 'speaking-remote' : ''}`}>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: status === 'connected' ? 'block' : 'none' }}
              />

              {/* Status Overlay for Remote */}
              {status !== 'connected' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, zIndex: 5, background: 'rgba(18,18,24,0.6)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
                  {status === 'queued' && (
                    <>
                      <div style={{ position: 'relative', width: 64, height: 64 }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(139,92,246,0.15)' }} />
                        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                        <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#3b82f6', animation: 'spin 1.5s linear infinite reverse' }} />
                      </div>
                      <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, textAlign: 'center', letterSpacing: '0.01em' }}>Looking for someone…</p>
                      <p style={{ color: '#475569', fontSize: 13, textAlign: 'center' }}>This usually takes a few seconds</p>
                    </>
                  )}
                  {status === 'ended' && (
                    <>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                        <PhoneOff size={28} color="#ef4444" />
                      </div>
                      <p style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>Chat ended</p>
                      <button onClick={() => findMatch({})} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 14, fontSize: 15, fontWeight: 700, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.3)', marginTop: 8 }}>
                        <SkipForward size={18} /> Find New Person
                      </button>
                    </>
                  )}
                  {status === 'idle' && (
                    <p style={{ color: '#475569', fontSize: 14, fontWeight: 500 }}>Initialising camera…</p>
                  )}
                </div>
              )}
              
              {/* Overlay Label */}
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: status === 'connected' ? '#10b981' : '#64748b' }} />
                Stranger
              </div>
              
              {/* Typing indicator overlay */}
              {peerTyping && status === 'connected' && (
                <div style={{ position: 'absolute', bottom: 16, left: 16, padding: '6px 14px', borderRadius: 99, background: 'rgba(10,10,15,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                  <span style={{ fontSize: 12, color: '#e2e8f0', marginLeft: 4, fontWeight: 500 }}>typing…</span>
                </div>
              )}
            </div>

            {/* Local / You container */}
            <div className={`video-box ${localSpeaking && micOn ? 'speaking-local' : ''}`}>
               <video ref={localVideoRef} autoPlay muted playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', display: 'block' }} />
               {!camOn && (
                 <div style={{ position: 'absolute', inset: 0, background: '#121218', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 5 }}>
                   <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <VideoOff size={28} color="#475569" />
                   </div>
                   <p style={{ color: '#475569', fontSize: 14, fontWeight: 500 }}>Camera off</p>
                 </div>
               )}
              {/* Overlay Label */}
              <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(8px)', zIndex: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6' }} />
                You {micOn ? '' : '(Muted)'}
              </div>
            </div>

            {/* Unread badge over video (mobile, when chat closed) */}
            {unread > 0 && !showChat && isMobile && (
              <button onClick={() => setShowChat(true)} style={{ position: 'absolute', top: '50%', right: 16, transform: 'translateY(-50%)', zIndex: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 99, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)', transition: 'transform 0.2s' }}>
                <MessageSquare size={18} /> {unread} new message{unread > 1 ? 's' : ''}
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
                  {messages.map((m, i) => {
                    if (m.from === 'ai') {
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                          <span style={{
                            padding: '6px 12px', borderRadius: 12,
                            background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)',
                            fontSize: 12, color: '#a78bfa', fontWeight: 600, textAlign: 'center',
                            maxWidth: '90%', lineHeight: 1.5,
                            boxShadow: '0 4px 12px rgba(139,92,246,0.1)'
                          }}>
                            {m.text}
                          </span>
                        </div>
                      );
                    }
                    return (
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
                    );
                  })}
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

            {/* Record */}
            <button
              className={`cb cb-record ${isRecording ? 'recording' : ''}`}
              onClick={toggleRecording}
              title={isRecording ? 'Stop recording' : 'Record TikTok Clip'}
              disabled={status !== 'connected'}
            >
              <Disc size={18} />
              <span className="cb-label">Clip</span>
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
