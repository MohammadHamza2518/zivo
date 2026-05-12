'use client';
import { useState } from 'react';
import Modal from '../Modal';

const REASONS = [
  { value: 'nudity', label: 'Nudity / Sexual content' },
  { value: 'harassment', label: 'Harassment / Bullying' },
  { value: 'spam', label: 'Spam / Bot' },
  { value: 'underage', label: 'Appears to be a minor' },
  { value: 'inappropriate', label: 'Inappropriate behaviour' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ isOpen, onClose, onReport }: {
  isOpen: boolean;
  onClose: () => void;
  onReport: (r: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const [done, setDone] = useState(false);

  const submit = () => {
    if (!selected) return;
    onReport(selected);
    setDone(true);
    setTimeout(() => { setDone(false); setSelected(''); onClose(); }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report User">
      {done ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, padding: '12px 0' }}>✅ Report submitted. Thanks for keeping Zivo safe.</p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {REASONS.map(r => (
              <button key={r.value} onClick={() => setSelected(r.value)}
                style={{ textAlign: 'left', padding: '10px 14px', borderRadius: 10, fontSize: 13, cursor: 'pointer',
                  background: selected === r.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${selected === r.value ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: selected === r.value ? '#c4b5fd' : '#94a3b8' }}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={submit} disabled={!selected} className="btn-primary"
            style={{ width: '100%', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600, opacity: selected ? 1 : 0.4, cursor: selected ? 'pointer' : 'not-allowed' }}>
            Submit Report
          </button>
        </>
      )}
    </Modal>
  );
}
