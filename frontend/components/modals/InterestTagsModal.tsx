'use client';

import { useState, KeyboardEvent } from 'react';
import Modal from '../Modal';

interface InterestTagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (tags: string[], country: string | null, gender: string | null) => void;
}

const SUGGESTED = ['Gaming', 'Music', 'Movies', 'Art', 'Sports', 'Tech', 'Travel', 'Fitness', 'Food', 'Anime'];

const COUNTRIES = [
  { value: '', label: 'Any Country' }, { value: 'US', label: '🇺🇸 United States' },
  { value: 'IN', label: '🇮🇳 India' }, { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' }, { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'DE', label: '🇩🇪 Germany' }, { value: 'JP', label: '🇯🇵 Japan' },
];

export default function InterestTagsModal({ isOpen, onClose, onStart }: InterestTagsModalProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');

  const add = (tag: string) => {
    const t = tag.trim().slice(0, 20);
    if (t && !tags.includes(t) && tags.length < 8) setTags(prev => [...prev, t]);
    setInput('');
  };

  const remove = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) { e.preventDefault(); add(input); }
    if (e.key === 'Backspace' && !input && tags.length) remove(tags[tags.length - 1]);
  };

  const handleStart = () => { onStart(tags, country || null, gender || null); setTags([]); setInput(''); setCountry(''); setGender(''); };

  const S: React.CSSProperties = { padding: '10px 14px', borderRadius: 8, fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#f1f5f9', width: '100%', appearance: 'none' as const };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Find Your Match">
      <p style={{ color: '#475569', fontSize: 12, marginBottom: 14 }}>Add interests to meet like-minded people (optional)</p>

      {/* Tags input */}
      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>INTERESTS</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minHeight: 44, padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 10 }}>
        {tags.map(t => (
          <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 99, background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', fontSize: 12 }}>
            {t} <button onClick={() => remove(t)} style={{ background: 'none', border: 'none', color: '#a78bfa', cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
          </span>
        ))}
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={tags.length ? '' : 'Type and press Enter…'}
          style={{ flexGrow: 1, minWidth: 80, background: 'none', border: 'none', outline: 'none', color: '#f1f5f9', fontSize: 13 }} />
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        {SUGGESTED.filter(s => !tags.includes(s)).slice(0, 8).map(s => (
          <button key={s} onClick={() => add(s)} style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', cursor: 'pointer' }}>+ {s}</button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>COUNTRY</label>
          <select value={country} onChange={e => setCountry(e.target.value)} style={S}>
            {COUNTRIES.map(c => <option key={c.value} value={c.value} style={{ background: '#111118' }}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>PREFER</label>
          <select value={gender} onChange={e => setGender(e.target.value)} style={S}>
            <option value="" style={{ background: '#111118' }}>Anyone</option>
            <option value="male" style={{ background: '#111118' }}>Males</option>
            <option value="female" style={{ background: '#111118' }}>Females</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleStart} className="btn-primary" style={{ flex: 1, padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>Start Chatting</button>
        <button onClick={() => onStart([], null, null)} className="btn-ghost" style={{ padding: '11px 16px', borderRadius: 10, fontSize: 13 }}>Skip</button>
      </div>
    </Modal>
  );
}
