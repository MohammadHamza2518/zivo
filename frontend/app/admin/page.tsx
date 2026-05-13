'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

interface Stats {
  online: number;
  activeChats: number;
  inQueue: number;
  totalSessions: number;
  uptime: number;
}
interface Room {
  roomId: string;
  fullRoomId: string;
  userA: string;
  fullUserA: string;
  userB: string;
  fullUserB: string;
  duration: number;
}
interface User {
  id: string;
  fullId: string;
  status: 'chatting' | 'queued' | 'idle';
  joinedAgo: number;
}
interface Report {
  socketId: string;
  reason: string;
  ts: number;
}

function fmt(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [pw, setPw] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'overview' | 'rooms' | 'users' | 'reports'>('overview');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [kickMsg, setKickMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authFetch = useCallback(async (path: string) => {
    const r = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [s, ro, u, rep] = await Promise.all([
        authFetch('/admin/stats'),
        authFetch('/admin/rooms'),
        authFetch('/admin/users'),
        authFetch('/admin/reports'),
      ]);
      setStats(s); setRooms(ro); setUsers(u); setReports(rep);
      setLastRefresh(new Date());
    } catch { /* silent */ }
  }, [token, authFetch]);

  useEffect(() => {
    if (!token) return;
    refresh();
    timerRef.current = setInterval(refresh, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [token, refresh]);

  const login = async () => {
    setLoading(true); setLoginErr('');
    try {
      const r = await fetch(`${API}/admin/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (d.ok) { setToken(d.token); }
      else setLoginErr('Wrong password. Try again.');
    } catch { setLoginErr('Cannot reach server. Is backend running?'); }
    setLoading(false);
  };

  const kick = async (fullId: string, label: string) => {
    if (!confirm(`Kick user ${label}?`)) return;
    try {
      await fetch(`${API}/admin/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ socketId: fullId }),
      });
      setKickMsg(`✓ User ${label} kicked`);
      setTimeout(() => setKickMsg(''), 3000);
      refresh();
    } catch { setKickMsg('Failed to kick user'); }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!token) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#08080f;font-family:'Inter',system-ui,sans-serif;color:#f1f5f9;-webkit-font-smoothing:antialiased;}
      `}</style>
      <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, position:'relative', overflow:'hidden' }}>
        {/* Animated background elements */}
        <div style={{ position:'absolute', width:600, height:600, background:'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 60%)', top:'-20%', right:'-10%', filter:'blur(60px)', zIndex:0 }} />
        <div style={{ position:'absolute', width:500, height:500, background:'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)', bottom:'-20%', left:'-10%', filter:'blur(60px)', zIndex:0 }} />
        
        <div style={{ width:'100%', maxWidth:400, position:'relative', zIndex:10 }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <img src="/zivo-logo-final.png" alt="Zivo Talk Logo" style={{ height: 120, width: 'auto', marginBottom: 20 }} />
            <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.02em', marginBottom:4 }}>Zivo Talk Admin</h1>
            <p style={{ fontSize:13, color:'#334155' }}>Restricted access — owners only</p>
          </div>

          {/* Card */}
          <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            borderRadius:20, overflow:'hidden' }}>
            <div style={{ height:2, background:'linear-gradient(90deg,#8b5cf6,#3b82f6,#06b6d4)' }} />
            <div style={{ padding:28 }}>
              <label style={{ fontSize:12, fontWeight:700, color:'#8b5cf6', letterSpacing:'0.08em', display:'block', marginBottom:8 }}>
                ADMIN PASSWORD
              </label>
              <input
                type="password"
                value={pw}
                onChange={e => setPw(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                placeholder="Enter your admin password"
                style={{ width:'100%', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:12, padding:'12px 14px', color:'#f1f5f9', fontSize:14, outline:'none',
                  marginBottom:loginErr ? 8 : 16, fontFamily:'Inter, system-ui, sans-serif' }}
              />
              {loginErr && <p style={{ fontSize:12, color:'#f87171', marginBottom:14 }}>{loginErr}</p>}
              <button onClick={login} disabled={loading || !pw}
                style={{ width:'100%', padding:'13px', borderRadius:12, border:'none',
                  background: pw ? 'linear-gradient(135deg,#7c3aed,#2563eb)' : 'rgba(255,255,255,0.05)',
                  color: pw ? '#fff' : '#334155', fontSize:14, fontWeight:700, cursor: pw ? 'pointer' : 'not-allowed',
                  fontFamily:'Inter, system-ui, sans-serif' }}>
                {loading ? 'Verifying...' : 'Enter Panel →'}
              </button>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:11, color:'#1e293b', marginTop:16 }}>
            This page is not publicly linked. Keep this URL private.
          </p>
        </div>
      </div>
    </>
  );

  // ── Dashboard ───────────────────────────────────────────────────────────────
  const statCards = [
    { label:'Online Users', value: stats?.online ?? '—', icon:'👥', color:'#60a5fa' },
    { label:'Active Chats', value: stats?.activeChats ?? '—', icon:'💬', color:'#4ade80' },
    { label:'In Queue', value: stats?.inQueue ?? '—', icon:'⏳', color:'#fbbf24' },
    { label:'Total Sessions', value: stats?.totalSessions ?? '—', icon:'📊', color:'#a78bfa' },
  ];

  const tabs = [
    { id:'overview', label:'Overview' },
    { id:'rooms', label:`Rooms (${rooms.length})` },
    { id:'users', label:`Users (${users.length})` },
    { id:'reports', label:`Reports (${reports.length})` },
  ] as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#08080f;font-family:'Inter',system-ui,sans-serif;color:#f1f5f9;-webkit-font-smoothing:antialiased;min-height:100vh;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:99px;}
        .tbl{width:100%;border-collapse:collapse;font-size:13px;}
        .tbl th{text-align:left;padding:10px 12px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#334155;border-bottom:1px solid rgba(255,255,255,0.06);}
        .tbl td{padding:11px 12px;border-bottom:1px solid rgba(255,255,255,0.04);color:#94a3b8;vertical-align:middle;}
        .tbl tr:last-child td{border-bottom:none;}
        .tbl tr:hover td{background:rgba(255,255,255,0.02);}
        .badge{display:inline-block;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:600;}
        .badge-green{background:rgba(74,222,128,0.1);color:#4ade80;border:1px solid rgba(74,222,128,0.2);}
        .badge-yellow{background:rgba(251,191,36,0.1);color:#fbbf24;border:1px solid rgba(251,191,36,0.2);}
        .badge-gray{background:rgba(255,255,255,0.05);color:#475569;border:1px solid rgba(255,255,255,0.08);}
        .kick-btn{padding:4px 12px;border-radius:8px;border:none;background:rgba(239,68,68,0.12);color:#f87171;font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s;font-family:'Inter',system-ui,sans-serif;}
        .kick-btn:hover{background:rgba(239,68,68,0.22);}
        .tab-btn{padding:8px 16px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.15s;font-family:'Inter',system-ui,sans-serif;}
        .tab-active{background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.25);}
        .tab-inactive{background:transparent;color:#334155;border:1px solid transparent;}
        .tab-inactive:hover{color:#64748b;}
      `}</style>

      <div style={{ minHeight:'100vh' }}>
        {/* Top bar */}
        <div style={{ position:'sticky', top:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'12px 24px', background:'rgba(8,8,14,0.95)',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
          backdropFilter:'blur(16px)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <img src="/zivo-logo-final.png" alt="Zivo Talk" style={{ height: 50, width: 'auto' }} />
            <span style={{ fontSize:12, padding:'2px 10px', borderRadius:99, background:'rgba(139,92,246,0.1)',
              border:'1px solid rgba(139,92,246,0.2)', color:'#a78bfa', fontWeight:700 }}>
              Admin Panel
            </span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {lastRefresh && (
              <span style={{ fontSize:11, color:'#1e293b' }}>
                Last sync: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button onClick={refresh}
              style={{ padding:'6px 14px', borderRadius:9, border:'1px solid rgba(255,255,255,0.08)',
                background:'rgba(255,255,255,0.04)', color:'#64748b', fontSize:12, cursor:'pointer',
                fontFamily:'Inter,system-ui,sans-serif' }}>
              ↻ Refresh
            </button>
            <button onClick={() => setToken('')}
              style={{ padding:'6px 14px', borderRadius:9, border:'1px solid rgba(239,68,68,0.2)',
                background:'rgba(239,68,68,0.08)', color:'#f87171', fontSize:12, cursor:'pointer',
                fontFamily:'Inter,system-ui,sans-serif' }}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'28px 20px' }}>

          {/* Uptime */}
          {stats && (
            <p style={{ fontSize:12, color:'#1e293b', marginBottom:20 }}>
              Server uptime: <span style={{ color:'#334155', fontWeight:600 }}>{fmt(stats.uptime)}</span>
              &nbsp;·&nbsp; Auto-refreshing every 5s
            </p>
          )}

          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:16, marginBottom:32 }}>
            {statCards.map(c => (
              <div key={c.label} style={{ position:'relative', padding:'24px', borderRadius:20, overflow:'hidden',
                background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)',
                boxShadow:'0 10px 40px rgba(0,0,0,0.3)', backdropFilter:'blur(10px)' }}>
                {/* Glow behind the card value */}
                <div style={{ position:'absolute', top:'-20%', right:'-10%', width:120, height:120, borderRadius:'50%', background:c.color, opacity:0.1, filter:'blur(40px)', pointerEvents:'none' }} />
                
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, position:'relative', zIndex:1 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:`${c.color}15`, border:`1px solid ${c.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                    {c.icon}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'#64748b', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                    {c.label}
                  </span>
                </div>
                <div style={{ fontSize:40, fontWeight:900, letterSpacing:'-0.02em', color: c.color, position:'relative', zIndex:1, textShadow:`0 4px 20px ${c.color}30` }}>
                  {c.value}
                </div>
              </div>
            ))}
          </div>

          {/* Kick toast */}
          {kickMsg && (
            <div style={{ padding:'10px 16px', borderRadius:10, background:'rgba(74,222,128,0.1)',
              border:'1px solid rgba(74,222,128,0.2)', color:'#4ade80', fontSize:13,
              fontWeight:600, marginBottom:16 }}>
              {kickMsg}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
            {tabs.map(t => (
              <button key={t.id} className={`tab-btn ${tab === t.id ? 'tab-active' : 'tab-inactive'}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Table card */}
          <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, overflow:'hidden' }}>
            <div style={{ height:2, background:'linear-gradient(90deg,#8b5cf6,#3b82f6,#06b6d4)' }} />
            <div style={{ overflowX:'auto' }}>

              {/* Overview */}
              {tab === 'overview' && (
                <div style={{ padding:24 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'#8b5cf6', letterSpacing:'0.08em', marginBottom:16 }}>
                    PLATFORM HEALTH
                  </p>
                  <div style={{ display:'grid', gap:16 }}>
                    {[
                      { label:'Online users', value: stats?.online || 0, max:1000, color:'#60a5fa' },
                      { label:'Active chat sessions', value: stats?.activeChats || 0, max:500, color:'#4ade80' },
                      { label:'Users in queue', value: stats?.inQueue || 0, max:100, color:'#fbbf24' },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                          <span style={{ fontSize:14, fontWeight:500, color:'#94a3b8' }}>{r.label}</span>
                          <span style={{ fontSize:14, fontWeight:800, color:r.color }}>{r.value} <span style={{fontSize:11, color:'#475569', fontWeight:600}}>/ {r.max}</span></span>
                        </div>
                        <div style={{ height:8, borderRadius:99, background:'rgba(255,255,255,0.04)', overflow:'hidden', border:'1px solid rgba(255,255,255,0.02)' }}>
                          <div style={{ height:'100%', borderRadius:99, background:r.color,
                            width:`${Math.min(100, (r.value / r.max) * 100)}%`,
                            transition:'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow:`0 0 10px ${r.color}80` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop:24, padding:16, borderRadius:12,
                    background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'#334155', marginBottom:8 }}>QUICK SUMMARY</p>
                    <p style={{ fontSize:13, color:'#475569', lineHeight:1.7 }}>
                      Total sessions since startup: <strong style={{ color:'#f1f5f9' }}>{stats?.totalSessions || 0}</strong><br/>
                      Active rooms: <strong style={{ color:'#f1f5f9' }}>{rooms.length}</strong><br/>
                      Pending reports: <strong style={{ color: reports.length > 0 ? '#fbbf24' : '#f1f5f9' }}>{reports.length}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Rooms */}
              {tab === 'rooms' && (
                rooms.length === 0
                  ? <p style={{ padding:32, textAlign:'center', color:'#334155', fontSize:14 }}>No active rooms right now.</p>
                  : <table className="tbl">
                    <thead>
                      <tr>
                        <th>Room ID</th>
                        <th>User A</th>
                        <th>User B</th>
                        <th>Duration</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map(r => (
                        <tr key={r.roomId}>
                          <td><code style={{ fontSize:11, color:'#475569' }}>{r.roomId}…</code></td>
                          <td><code style={{ fontSize:11 }}>{r.userA}…</code></td>
                          <td><code style={{ fontSize:11 }}>{r.userB}…</code></td>
                          <td style={{ color:'#fbbf24' }}>{fmt(r.duration)}</td>
                          <td>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="kick-btn" onClick={() => kick(r.fullUserA, r.userA)}>Kick A</button>
                              <button className="kick-btn" onClick={() => kick(r.fullUserB, r.userB)}>Kick B</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}

              {/* Users */}
              {tab === 'users' && (
                users.length === 0
                  ? <p style={{ padding:32, textAlign:'center', color:'#334155', fontSize:14 }}>No connected users.</p>
                  : <table className="tbl">
                    <thead>
                      <tr>
                        <th>Socket ID</th>
                        <th>Status</th>
                        <th>Online For</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td><code style={{ fontSize:11 }}>{u.id}…</code></td>
                          <td>
                            <span className={`badge ${u.status === 'chatting' ? 'badge-green' : u.status === 'queued' ? 'badge-yellow' : 'badge-gray'}`}>
                              {u.status}
                            </span>
                          </td>
                          <td style={{ color:'#64748b' }}>{fmt(u.joinedAgo)}</td>
                          <td>
                            <button className="kick-btn" onClick={() => kick(u.fullId, u.id + '…')}>
                              Kick
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}

              {/* Reports */}
              {tab === 'reports' && (
                reports.length === 0
                  ? <p style={{ padding:32, textAlign:'center', color:'#334155', fontSize:14 }}>No reports yet. All good! ✅</p>
                  : <table className="tbl">
                    <thead>
                      <tr>
                        <th>Reporter</th>
                        <th>Reason</th>
                        <th>Time</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.map((rep, i) => (
                        <tr key={i}>
                          <td><code style={{ fontSize:11 }}>{rep.socketId.slice(0,8)}…</code></td>
                          <td style={{ color:'#fbbf24' }}>{rep.reason}</td>
                          <td style={{ color:'#475569', fontSize:12 }}>{new Date(rep.ts).toLocaleTimeString()}</td>
                          <td>
                            <button className="kick-btn" onClick={() => kick(rep.socketId, rep.socketId.slice(0,8))}>
                              Kick Reporter
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
              )}

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
