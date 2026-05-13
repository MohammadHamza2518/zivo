'use client';
import Modal from '../Modal';
import { AlertTriangle, Check } from 'lucide-react';

export default function NSFWWarning({ isOpen, onAccept }: { isOpen: boolean; onAccept: () => void }) {
  return (
    <Modal isOpen={isOpen} hideClose>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={24} color="#fbbf24" />
        </div>
        <h2 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Before You Enter</h2>
        <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
          Zivo Talk connects you with strangers in real-time. You must be <strong style={{ color: '#f1f5f9' }}>18+</strong> and agree to our community standards.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, textAlign: 'left' }}>
          {['Be respectful to everyone', 'No nudity or sexual content', 'No harassment or hate speech', 'Follow community guidelines'].map(rule => (
            <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={9} color="#8b5cf6" />
              </div>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>{rule}</span>
            </div>
          ))}
        </div>
        <button onClick={onAccept} className="btn-primary" style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
          I Agree — Enter Zivo Talk
        </button>
        <p style={{ fontSize: 11, color: '#334155', marginTop: 12 }}>
          By entering you agree to our{' '}
          <a href="/terms" style={{ color: '#475569', textDecoration: 'underline' }}>Terms</a> &amp;{' '}
          <a href="/privacy" style={{ color: '#475569', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
      </div>
    </Modal>
  );
}
