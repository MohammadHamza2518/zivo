'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Video, Menu, X, Zap } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const goToChat = () => {
    if (!localStorage.getItem('zivo-age-ok')) {
      router.push('/?warn=1');
    } else {
      router.push('/chat');
    }
  };

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: 'rgba(10,10,15,0.88)', backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Video size={15} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Zivo
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hidden-mobile">
          <a href="/#features" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Features</a>
          <a href="/#safety" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Safety</a>
          <a href="/#faq" style={{ color: '#64748b', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>FAQ</a>
          <button onClick={goToChat} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
            <Zap size={13} /> Start Chatting
          </button>
        </nav>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4 }} className="show-mobile">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{ padding: '12px 24px 20px', background: 'rgba(10,10,15,0.98)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <a href="/#features" onClick={() => setOpen(false)} style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>Features</a>
          <a href="/#safety" onClick={() => setOpen(false)} style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>Safety</a>
          <a href="/#faq" onClick={() => setOpen(false)} style={{ color: '#94a3b8', fontSize: 14, textDecoration: 'none' }}>FAQ</a>
          <button onClick={() => { setOpen(false); goToChat(); }} className="btn-primary" style={{ padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
            Start Chatting
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) { .hidden-mobile { display: none !important; } }
        @media (min-width: 641px) { .show-mobile { display: none !important; } }
      `}</style>
    </header>
  );
}
