import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Privacy Policy — Zivo' };

export default function Privacy() {
  const sections = [
    { title: 'Information We Collect', body: 'Zivo does not collect personally identifiable information. We do not require accounts, emails, or phone numbers. Video and audio streams are transmitted peer-to-peer using WebRTC and are never stored on our servers.' },
    { title: 'Connection Data', body: 'We temporarily process IP addresses and WebSocket connection metadata to facilitate matchmaking. This data is held in memory only and discarded immediately when you disconnect.' },
    { title: 'Cookies', body: 'We use a single local storage entry to remember your age verification consent. No tracking cookies or third-party analytics are used.' },
    { title: 'Third Parties', body: 'We use Google STUN servers to facilitate WebRTC connections. These may receive your IP address as part of the ICE negotiation process, subject to Google\'s privacy policy.' },
    { title: 'Children\'s Privacy', body: 'Zivo is strictly for users aged 18 and over. If you believe a minor is using the platform, please report it immediately.' },
    { title: 'Contact', body: 'For privacy concerns, contact us at privacy@zivo.app.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '100px 24px 60px', maxWidth: 720, margin: '0 auto' }}>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 32 }}>← Back to Zivo</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: '#334155', fontSize: 13, marginBottom: 40 }}>Last updated: January 2025</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {sections.map(s => (
          <div key={s.title}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 8, color: '#c4b5fd' }}>{s.title}</h2>
            <p style={{ color: '#64748b', lineHeight: 1.7, fontSize: 14 }}>{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
