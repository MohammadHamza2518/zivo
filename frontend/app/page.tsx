'use client';
import { useState, useEffect, useRef } from 'react';
import Logo from '../components/Logo';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showWarn, setShowWarn] = useState(false);
  const [online, setOnline] = useState(1247);
  const [entered, setEntered] = useState(false);
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const iv = setInterval(() => setOnline(n => n + Math.floor(Math.random() * 7 - 3)), 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (searchParams.get('warn') === '1') setShowWarn(true);
  }, [searchParams]);

  // Particle canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    let raf: number;

    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);

    const N = 55;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      op: Math.random() * 0.45 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 130) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(139,92,246,${0.13 * (1 - d / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.op})`;
        ctx.fill();
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);

  const go = () => {
    setEntered(true);
    setTimeout(() => router.push('/chat'), 350);
  };

  const handleStart = (g: 'male' | 'female') => {
    setGender(g);
    if (typeof window !== 'undefined') localStorage.setItem('zivo-gender', g);
    const ok = typeof window !== 'undefined' && localStorage.getItem('zivo-age-ok');
    if (ok) { go(); } else { setShowWarn(true); }
  };

  const handleAccept = () => {
    if (typeof window !== 'undefined') localStorage.setItem('zivo-age-ok', '1');
    setShowWarn(false);
    go();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { height: 100%; }
        body {
          height: 100%;
          background: #08080f;
          font-family: 'Inter', system-ui, sans-serif;
          color: #f1f5f9;
          -webkit-font-smoothing: antialiased;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }

        .page {
          height: 100dvh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          transition: opacity 0.35s, transform 0.35s;
        }
        .page.leaving { opacity: 0; transform: scale(1.04); }

        canvas { position: absolute; inset: 0; z-index: 0; pointer-events: none; }

        .blob {
          position: absolute; border-radius: 50%;
          filter: blur(90px); pointer-events: none; z-index: 0;
        }
        .blob-1 {
          width: min(580px,90vw); height: min(580px,90vw);
          background: radial-gradient(circle, rgba(109,40,217,0.22) 0%, transparent 70%);
          top: -25%; right: -15%;
          animation: bf 11s ease-in-out infinite;
        }
        .blob-2 {
          width: min(460px,80vw); height: min(460px,80vw);
          background: radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%);
          bottom: -20%; left: -10%;
          animation: bf 14s ease-in-out infinite reverse;
        }
        .blob-3 {
          width: min(260px,60vw); height: min(260px,60vw);
          background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%);
          top: 45%; left: 45%;
          animation: bf 8s ease-in-out infinite 2s;
        }
        @keyframes bf {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(25px,-18px) scale(1.04); }
          66% { transform: translate(-18px,14px) scale(0.97); }
        }

        .center {
          position: relative; z-index: 10;
          max-width: 620px; width: 100%;
          display: flex; flex-direction: column; align-items: center;
          padding-top: 130px;
        }

        .pill {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 8px 18px; border-radius: 99px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.6);
          margin-bottom: 32px;
          white-space: nowrap;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        }
        .dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #4ade80; box-shadow: 0 0 8px #4ade80;
          animation: breathe 2s ease-in-out infinite;
          flex-shrink: 0;
        }
        @keyframes breathe {
          0%,100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(0.82); }
        }

        .headline {
          font-size: clamp(2.8rem, 8vw, 5.5rem);
          font-weight: 900; line-height: 1.05;
          letter-spacing: -0.03em; margin-bottom: 16px; color: #fff;
        }
        .headline em {
          font-style: normal;
          background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 50%, #67e8f9 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; background-size: 200% 200%;
          animation: shimmer 4s ease infinite;
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .sub {
          font-size: clamp(0.9rem, 2.2vw, 1.05rem);
          color: #475569; font-weight: 400;
          margin-bottom: 36px; line-height: 1.65;
        }

        .start-actions {
          display: flex; gap: 14px; margin-bottom: 24px;
          flex-direction: column; width: 100%; max-width: 320px;
        }
        @media (min-width: 500px) {
          .start-actions { flex-direction: row; max-width: 440px; }
        }

        .start-btn {
          position: relative;
          padding: 16px 20px; border-radius: 16px; border: none;
          cursor: pointer; flex: 1;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: clamp(1rem, 2vw, 1.08rem);
          font-weight: 800; color: #fff;
          transition: transform 0.18s, box-shadow 0.18s;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          overflow: hidden;
        }
        .start-btn.male-btn {
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          box-shadow: 0 8px 24px rgba(59,130,246,0.25);
        }
        .start-btn.male-btn:hover {
          transform: translateY(-2px); box-shadow: 0 12px 32px rgba(59,130,246,0.4);
        }
        .start-btn.male-btn .ring {
          border: 1px solid rgba(59,130,246,0.5);
        }

        .start-btn.female-btn {
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          box-shadow: 0 8px 24px rgba(236,72,153,0.25);
        }
        .start-btn.female-btn:hover {
          transform: translateY(-2px); box-shadow: 0 12px 32px rgba(236,72,153,0.4);
        }
        .start-btn.female-btn .ring {
          border: 1px solid rgba(236,72,153,0.5);
        }

        .start-btn:active { transform: scale(0.96) !important; }
        .start-btn span { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }

        .ring {
          position: absolute; inset: -4px; border-radius: 20px;
          animation: rp 2.5s ease-out infinite; pointer-events: none;
        }
        @keyframes rp {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(1.1); opacity: 0; }
        }
        @keyframes ab {
          0%,100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        .arrow { display: inline-block; animation: ab 1.8s ease-in-out infinite; }

        .fine {
          font-size: 11px; color: #1e293b; letter-spacing: 0.05em;
        }

        .bottom {
          position: absolute; bottom: 0; left: 0; right: 0; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          padding-bottom: max(14px, env(safe-area-inset-bottom));
        }
        .brand {
          font-weight: 900; font-size: 15px; letter-spacing: -0.01em;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .links { display: flex; gap: 18px; }
        .links a {
          color: #1e293b; font-size: 11px; text-decoration: none;
          font-weight: 500; letter-spacing: 0.03em;
          transition: color 0.15s;
        }
        .links a:hover { color: #475569; }

        @media (max-width: 500px) {
          .start-btn { padding: 15px 36px; }
          .bottom { 
            flex-direction: column; 
            gap: 12px; 
            padding: 20px 16px; 
            position: relative;
            background: rgba(8, 8, 14, 0.5);
            backdrop-filter: blur(10px);
          }
          .links { 
            gap: 16px; 
            flex-wrap: wrap; 
            justify-content: center; 
          }
          .pill { font-size: 11px; }
        }

        /* ── Age Warning Modal — fully self-contained ────── */
        .warn-overlay {
          position: fixed; inset: 0; z-index: 999;
          background: rgba(0,0,0,0.82);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        .warn-box {
          width: 100%; max-width: 420px;
          background: #111118;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 22px; overflow: hidden;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(139,92,246,0.1);
          animation: slideUp 0.25s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .warn-accent {
          height: 2px;
          background: linear-gradient(90deg, #8b5cf6, #3b82f6, #06b6d4);
        }
        .warn-body { padding: 28px 24px; text-align: center; }
        .warn-icon {
          width: 54px; height: 54px; border-radius: 14px;
          background: rgba(251,191,36,0.12);
          border: 1px solid rgba(251,191,36,0.25);
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; margin: 0 auto 18px;
        }
        .warn-title { font-size: 19px; font-weight: 800; margin-bottom: 8px; }
        .warn-desc {
          color: #64748b; font-size: 13px; line-height: 1.65;
          margin-bottom: 20px;
        }
        .warn-rules {
          display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 22px; text-align: left;
        }
        .warn-rule {
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; color: #94a3b8;
        }
        .warn-check {
          width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
          background: rgba(139,92,246,0.15);
          border: 1px solid rgba(139,92,246,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
        }
        .warn-btn {
          width: 100%; padding: 14px; border-radius: 13px; border: none;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: #fff; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: 'Inter', system-ui, sans-serif;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s;
        }
        .warn-btn:active { opacity: 0.85; transform: scale(0.98); }
        .warn-note {
          font-size: 11px; color: #1e293b; margin-top: 12px;
        }
        .warn-note a { color: #334155; }
      `}</style>

      {/* ── Age Warning Modal ─────────────────────────── */}
      {showWarn && (
        <div className="warn-overlay">
          <div className="warn-box">
            <div className="warn-accent" />
            <div className="warn-body">
              <div className="warn-icon">⚠️</div>
              <h2 className="warn-title">Before You Enter</h2>
              <p className="warn-desc">
                Zivo Talk connects you with real strangers. You must be <strong style={{ color: '#f1f5f9' }}>18+</strong> and agree to our community rules.
              </p>
              <div className="warn-rules">
                {['Be respectful to everyone', 'No nudity or explicit content', 'No harassment or hate speech', 'Follow community guidelines'].map(r => (
                  <div key={r} className="warn-rule">
                    <div className="warn-check">✓</div>
                    {r}
                  </div>
                ))}
              </div>
              <button className="warn-btn" onClick={handleAccept}>
                I Agree — Enter Zivo Talk
              </button>
              <p className="warn-note">
                By entering you agree to our{' '}
                <a href="/terms">Terms</a> &amp; <a href="/privacy">Privacy Policy</a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Page ─────────────────────────────────── */}
      <div className={`page${entered ? ' leaving' : ''}`}>
        {/* Professional Top Navbar */}
        <header style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '24px 40px', background: 'rgba(10, 10, 15, 0.7)',
          backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <Logo height={50} />
          <nav style={{ display: 'flex', gap: 24 }}>
            <a href="/guidelines" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Rules</a>
            <a href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Safety</a>
          </nav>
        </header>

        <canvas ref={canvasRef} />
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />

        <div className="center">
          <div className="pill">
            <span className="dot" />
            <span>{online.toLocaleString()} people online</span>
          </div>
          <h1 className="headline">
            Talk to <em>Strangers.</em>
            <br />No rules.
          </h1>

          <p className="sub">
            Anonymous video chat — instant, free, no account.
          </p>

          <div className="start-actions">
            <button className="start-btn male-btn" onClick={() => handleStart('male')}>
              <div className="ring" />
              <span>♂ Male <span className="arrow">→</span></span>
            </button>
            <button className="start-btn female-btn" onClick={() => handleStart('female')}>
              <div className="ring" />
              <span>♀ Female <span className="arrow">→</span></span>
            </button>
          </div>

          <p className="fine">No signup &nbsp;·&nbsp; No data stored &nbsp;·&nbsp; 18+</p>
        </div>

        <div className="bottom">
          <Logo height={60} />
          <nav className="links">
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
        </div>
      </div>
    </>
  );
}
