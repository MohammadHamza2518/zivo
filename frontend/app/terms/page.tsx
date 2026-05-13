import type { Metadata } from 'next';
import Logo from '../../components/Logo';
export const metadata: Metadata = { title: 'Terms of Service — Zivo Talk' };

export default function Terms() {
  const sections = [
    { title: '1. Acceptance of Terms', body: 'By using Zivo Talk you agree to these Terms of Service. If you do not agree, do not use the platform.' },
    { title: '2. Eligibility', body: 'You must be 18 years of age or older to use Zivo Talk. By entering, you confirm you meet this requirement.' },
    { title: '3. Prohibited Conduct', body: 'You may not: share nudity or sexual content, harass or threaten other users, impersonate any person, share illegal content, attempt to hack or disrupt the service, or use the platform for commercial solicitation.' },
    { title: '4. Disclaimer of Warranties', body: 'Zivo Talk is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service.' },
    { title: '5. Limitation of Liability', body: 'Zivo Talk is not liable for any damages arising from your use of the platform or interactions with other users.' },
    { title: '6. Termination', body: 'We reserve the right to ban users who violate these terms at any time without notice.' },
    { title: '7. Changes', body: 'We may update these terms at any time. Continued use of the platform after changes constitutes acceptance.' },
    { title: '8. Contact', body: 'For any problem or help, contact us at zivotalk@gmail.com.' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '60px 24px 60px', maxWidth: 720, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48, display: 'flex', justifyContent: 'center' }}>
        <Logo height={56} />
      </div>
      <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#475569', fontSize: 13, textDecoration: 'none', marginBottom: 32 }}>← Back to Zivo Talk</a>
      <h1 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 8 }}>Terms of Service</h1>
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
