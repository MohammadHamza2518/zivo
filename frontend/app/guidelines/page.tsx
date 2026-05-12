import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Community Guidelines — Zivo' };

const RULES = [
  { emoji: '🤝', title: 'Be Respectful', desc: 'Treat every person you meet with basic human dignity. Rude, hateful, or demeaning behaviour is not tolerated.' },
  { emoji: '🔞', title: 'Adults Only', desc: 'You must be 18+ to use Zivo. Any nudity, sexual content, or explicit behaviour will result in a permanent ban.' },
  { emoji: '🚫', title: 'No Harassment', desc: 'Do not threaten, bully, or repeatedly target specific individuals. Hate speech based on race, gender, religion, or sexuality is prohibited.' },
  { emoji: '⚠️', title: 'No Illegal Content', desc: 'Do not share, display, or discuss illegal content of any kind, including child exploitation material. Such incidents are reported to law enforcement.' },
  { emoji: '🛡️', title: 'Protect Your Privacy', desc: 'Do not share personal information (phone numbers, home addresses, financial details) with strangers. Stay safe.' },
  { emoji: '📣', title: 'No Spam or Bots', desc: 'Do not use automated tools, bots, or scripts. Commercial solicitation and repetitive spam messages are prohibited.' },
];

export default function Guidelines() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '100px 24px 60px', maxWidth: 760, margin: '0 auto' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 32 }}>← Back to Zivo</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>Community Guidelines</h1>
      <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
        Zivo is built for genuine, fun, and respectful connections. These guidelines exist to protect every person on our platform.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 16, marginBottom: 48 }}>
        {RULES.map(r => (
          <div key={r.title} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{r.emoji}</div>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{r.title}</p>
            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>{r.desc}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: 20, borderRadius: 16, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.7 }}>
          Violations can be reported using the <strong style={{ color: '#c4b5fd' }}>Report button</strong> during any chat.
          Our moderation team reviews all reports and takes action quickly.
        </p>
      </div>
    </div>
  );
}
