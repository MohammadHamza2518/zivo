import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Zivo — Anonymous Video Chat',
  description: 'Learn how Zivo works and meet the founder. Anonymous random video chat, built for real human connections.',
};

export default function AboutPage() {
  const steps = [
    {
      n: '01',
      icon: '🖱️',
      title: 'Click Start Talking',
      desc: 'No signup, no email, no phone number. Just hit the button and you\'re in. We generate an anonymous session ID for you instantly.',
    },
    {
      n: '02',
      icon: '🔀',
      title: 'Instant Matchmaking',
      desc: 'Our server finds another online user in milliseconds. Both of you get connected through a private, encrypted peer-to-peer channel.',
    },
    {
      n: '03',
      icon: '📡',
      title: 'Peer-to-Peer Video',
      desc: 'Your video and audio travel directly from your device to theirs using WebRTC — our servers never see or store your stream.',
    },
    {
      n: '04',
      icon: '⏭️',
      title: 'Skip or Stay',
      desc: 'Vibe check failed? Hit Next — you\'re matched with someone new in under a second. No awkward goodbyes required.',
    },
  ];

  const tech = [
    { name: 'Next.js 16', desc: 'Frontend framework', color: '#f1f5f9' },
    { name: 'WebRTC', desc: 'Peer-to-peer video', color: '#60a5fa' },
    { name: 'Socket.IO', desc: 'Real-time signaling', color: '#a78bfa' },
    { name: 'Node.js', desc: 'Backend server', color: '#4ade80' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #08080f;
          color: #f1f5f9;
          font-family: 'Inter', system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .page { min-height: 100dvh; }

        /* Top nav */
        .topnav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 28px;
          background: rgba(8,8,14,0.92);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .brand {
          font-weight: 900; font-size: 18px; letter-spacing: -0.02em;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; text-decoration: none;
        }
        .back-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 16px; border-radius: 10px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #64748b; font-size: 13px; font-weight: 500;
          text-decoration: none; transition: all 0.15s;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .back-btn:hover { background: rgba(255,255,255,0.09); color: #94a3b8; }

        /* Hero */
        .hero {
          max-width: 760px; margin: 0 auto;
          padding: 72px 24px 56px;
          text-align: center;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 14px; border-radius: 99px;
          background: rgba(139,92,246,0.1);
          border: 1px solid rgba(139,92,246,0.2);
          font-size: 11px; font-weight: 700; color: #a78bfa;
          letter-spacing: 0.08em; text-transform: uppercase;
          margin-bottom: 22px;
        }
        .hero h1 {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 900; line-height: 1.08;
          letter-spacing: -0.03em; margin-bottom: 18px;
        }
        .hero h1 em {
          font-style: normal;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero p {
          font-size: clamp(1rem, 2vw, 1.1rem);
          color: #64748b; line-height: 1.7; max-width: 540px; margin: 0 auto;
        }

        /* Divider */
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
          margin: 0 24px;
        }

        /* Section */
        .section { max-width: 1000px; margin: 0 auto; padding: 64px 24px; }
        .section-label {
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #8b5cf6; margin-bottom: 12px;
        }
        .section-title {
          font-size: clamp(1.8rem, 4vw, 2.6rem);
          font-weight: 900; letter-spacing: -0.02em; margin-bottom: 10px;
        }
        .section-sub {
          color: #475569; font-size: 15px; line-height: 1.65;
          max-width: 500px; margin-bottom: 48px;
        }

        /* Steps grid */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }
        .step-card {
          padding: 24px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 18px;
          transition: border-color 0.2s, background 0.2s;
          position: relative; overflow: hidden;
        }
        .step-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139,92,246,0.4), transparent);
          opacity: 0; transition: opacity 0.2s;
        }
        .step-card:hover { border-color: rgba(139,92,246,0.2); background: rgba(139,92,246,0.03); }
        .step-card:hover::before { opacity: 1; }
        .step-num {
          font-size: 11px; font-weight: 800; color: rgba(139,92,246,0.4);
          letter-spacing: 0.1em; margin-bottom: 12px;
        }
        .step-icon { font-size: 26px; margin-bottom: 12px; display: block; }
        .step-title { font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .step-desc { font-size: 13px; color: #475569; line-height: 1.65; }

        /* Tech stack */
        .tech-row {
          display: flex; flex-wrap: wrap; gap: 10px; margin-top: 40px;
        }
        .tech-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 16px; border-radius: 10px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }
        .tech-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .tech-name { font-size: 13px; font-weight: 600; }
        .tech-desc { font-size: 11px; color: #334155; margin-left: 2px; }

        /* Founder section */
        .founder-section {
          max-width: 1000px; margin: 0 auto; padding: 0 24px 80px;
        }
        .founder-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px; overflow: hidden;
          display: grid; grid-template-columns: auto 1fr;
        }
        .founder-accent-bar {
          width: 4px;
          background: linear-gradient(180deg, #8b5cf6, #3b82f6, #06b6d4);
        }
        .founder-body { padding: 36px 36px; }
        .founder-meta {
          display: flex; align-items: center; gap: 16px; margin-bottom: 24px;
        }
        .founder-avatar {
          width: 72px; height: 72px; border-radius: 18px; flex-shrink: 0;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; font-weight: 900; color: #fff;
          letter-spacing: -0.02em;
          box-shadow: 0 8px 28px rgba(124,58,237,0.35);
        }
        .founder-info {}
        .founder-role {
          font-size: 11px; font-weight: 700; color: #8b5cf6;
          letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;
        }
        .founder-name {
          font-size: 22px; font-weight: 900; letter-spacing: -0.02em;
        }
        .founder-quote {
          font-size: 15px; color: #64748b; line-height: 1.75;
          margin-bottom: 24px; font-style: italic;
          border-left: 2px solid rgba(139,92,246,0.3);
          padding-left: 16px;
        }
        .founder-bio {
          font-size: 14px; color: #475569; line-height: 1.75; margin-bottom: 24px;
        }
        .founder-tags {
          display: flex; flex-wrap: wrap; gap: 8px;
        }
        .founder-tag {
          padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 600;
          background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
          color: #a78bfa;
        }

        /* Stats */
        .stats-row {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 12px; margin-bottom: 48px;
        }
        .stat-card {
          padding: 20px; border-radius: 16px;
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          text-align: center;
        }
        .stat-num {
          font-size: 2rem; font-weight: 900; letter-spacing: -0.03em;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stat-label { font-size: 12px; color: #334155; margin-top: 4px; font-weight: 500; }

        /* CTA */
        .cta-section {
          max-width: 700px; margin: 0 auto; padding: 0 24px 80px;
          text-align: center;
        }
        .cta-box {
          padding: 48px 36px; border-radius: 24px;
          background: rgba(139,92,246,0.05);
          border: 1px solid rgba(139,92,246,0.15);
        }
        .cta-box h2 { font-size: 2rem; font-weight: 900; margin-bottom: 10px; letter-spacing: -0.02em; }
        .cta-box p { color: #475569; font-size: 14px; margin-bottom: 28px; line-height: 1.6; }
        .cta-btn {
          display: inline-flex; align-items: center; gap: 10px;
          padding: 15px 36px; border-radius: 14px; border: none;
          background: linear-gradient(135deg, #7c3aed, #2563eb);
          color: #fff; font-size: 15px; font-weight: 700;
          text-decoration: none; cursor: pointer;
          font-family: 'Inter', system-ui, sans-serif;
          box-shadow: 0 8px 28px rgba(124,58,237,0.4);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(124,58,237,0.5); }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 24px 28px;
          display: flex; flex-wrap: wrap; align-items: center;
          justify-content: space-between; gap: 12px;
          max-width: 1000px; margin: 0 auto;
        }
        .footer-brand {
          font-weight: 800; font-size: 14px;
          background: linear-gradient(135deg, #a78bfa, #60a5fa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
        .footer-links a {
          color: #1e293b; font-size: 12px; text-decoration: none;
          font-weight: 500; transition: color 0.15s;
        }
        .footer-links a:hover { color: #475569; }
        .footer-copy { font-size: 11px; color: #1e293b; }

        @media (max-width: 600px) {
          .founder-card { grid-template-columns: 1fr; }
          .founder-accent-bar { width: 100%; height: 4px; }
          .founder-body { padding: 24px 20px; }
          .stats-row { grid-template-columns: repeat(3, 1fr); }
          .stat-num { font-size: 1.4rem; }
          .cta-box { padding: 32px 20px; }
          .topnav { padding: 12px 16px; }
          .section { padding: 48px 16px; }
          .founder-section { padding: 0 16px 60px; }
        }
      `}</style>

      <div className="page">

        {/* ── Navbar ─────────────────────────────────── */}
        <nav className="topnav">
          <a href="/" className="brand">Zivo</a>
          <a href="/" className="back-btn">← Back to Home</a>
        </nav>

        {/* ── Hero ───────────────────────────────────── */}
        <div className="hero">
          <div className="hero-badge">ℹ️ About Zivo</div>
          <h1>
            Real Connections,<br />
            <em>Zero Boundaries.</em>
          </h1>
          <p>
            Zivo is an anonymous random video chat platform built for people who want genuine, spontaneous conversations — no profiles, no algorithms, no filters.
          </p>
        </div>

        <div className="divider" />

        {/* ── How it works ───────────────────────────── */}
        <div className="section">
          <p className="section-label">How it works</p>
          <h2 className="section-title">Four steps to a conversation</h2>
          <p className="section-sub">
            From button click to live video in under 3 seconds. Here&apos;s the full journey.
          </p>

          <div className="steps-grid">
            {steps.map(s => (
              <div key={s.n} className="step-card">
                <p className="step-num">{s.n}</p>
                <span className="step-icon">{s.icon}</span>
                <p className="step-title">{s.title}</p>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>

          {/* Tech */}
          <div style={{ marginTop: 56 }}>
            <p className="section-label">Technology</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Built on serious tech
            </h3>
            <p style={{ color: '#475569', fontSize: 14, lineHeight: 1.65 }}>
              No gimmicks. Zivo uses the same WebRTC standard that powers Google Meet, Zoom, and Discord video calls — just without the corporate overhead.
            </p>
            <div className="tech-row">
              {tech.map(t => (
                <div key={t.name} className="tech-chip">
                  <div className="tech-dot" style={{ background: t.color }} />
                  <span className="tech-name">{t.name}</span>
                  <span className="tech-desc">— {t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ── Stats ──────────────────────────────────── */}
        <div className="section" style={{ paddingBottom: 32 }}>
          <p className="section-label">By the numbers</p>
          <h2 className="section-title" style={{ marginBottom: 32 }}>Growing every day</h2>
          <div className="stats-row">
            {[
              { n: '1K+', l: 'Users Online Now' },
              { n: '<1s', l: 'Match Time' },
              { n: '100%', l: 'Anonymous' },
            ].map(s => (
              <div key={s.l} className="stat-card">
                <div className="stat-num">{s.n}</div>
                <div className="stat-label">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* ── Founder ────────────────────────────────── */}
        <div className="founder-section" style={{ paddingTop: 64 }}>
          <p className="section-label" style={{ marginBottom: 12 }}>The Builder</p>
          <h2 className="section-title" style={{ marginBottom: 32 }}>Meet the founder</h2>

          <div className="founder-card">
            <div className="founder-accent-bar" />
            <div className="founder-body">
              <div className="founder-meta">
                <div className="founder-avatar">MH</div>
                <div className="founder-info">
                  <div className="founder-role">Founder & Developer</div>
                  <div className="founder-name">Mohammad Hamza</div>
                </div>
              </div>

              <p className="founder-quote">
                &ldquo;I built Zivo because I missed the raw, unfiltered energy of meeting someone completely random — no bios, no filters, just a real conversation. The internet used to feel like that.&rdquo;
              </p>

              <p className="founder-bio">
                Mohammad Hamza is an indie developer and builder who believes the best products are the ones that get out of the way. Zivo was born from a simple frustration — every platform today demands your data, your profile, your identity.
                <br /><br />
                Zivo is the opposite. One click. One conversation. No traces left behind. Hamza built the entire platform from scratch — frontend, backend, real-time signaling, matchmaking engine — all designed to be fast, private, and deployed anywhere with minimal setup.
              </p>

              <div className="founder-tags">
                {['🚀 Indie Builder', '⚡ Full-Stack Dev', '🎯 Product Design', '🌐 WebRTC', '🔒 Privacy First'].map(t => (
                  <span key={t} className="founder-tag">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA ────────────────────────────────────── */}
        <div className="cta-section">
          <div className="cta-box">
            <h2>Ready to connect?</h2>
            <p>No account. No setup. Just click and meet someone new.</p>
            <a href="/" className="cta-btn">
              Start Talking →
            </a>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="footer">
          <span className="footer-brand">Zivo</span>
          <nav className="footer-links">
            <a href="/about">About</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/guidelines">Guidelines</a>
          </nav>
          <span className="footer-copy">© 2025 Zivo · Built by Mohammad Hamza</span>
        </footer>

      </div>
    </>
  );
}
