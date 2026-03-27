'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SQUADS, PHASES, FUNNEL_TPL, KPI_TPL, TASK_COLS, PRIO, THEME as T, fB, fN } from '@/lib/constants';

const btn = (color: string, extra?: any) => ({
  background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10,
  padding: '8px 16px', color, cursor: 'pointer', fontSize: 12, fontWeight: 600, ...extra,
});

export default function HubApp({ user }: { user: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('hub');
  const [squad, setSquad] = useState('todos');
  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [clientTab, setClientTab] = useState('info');
  const [dailyOff, setDailyOff] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [dragTask, setDragTask] = useState<string | null>(null);
  const [nc, setNc] = useState({ name: '', squad: 'lancamentos', niche: '', product: '', contact_name: '', contact_phone: '', whatsapp_group: '', fee: '', meta_url: '', google_url: '', analytics_url: '', hotmart_url: '' });
  const [nt, setNt] = useState({ title: '', client_id: '', priority: 'normal', due_date: '' });
  const [nm, setNm] = useState({ title: '', client_id: '', date: '', time: '', type: 'Alinhamento', link: '' });
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);
  // Metrics editing
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [funnelData, setFunnelData] = useState<any>({});
  const [kpiData, setKpiData] = useState<any>({});
  const [metricsData, setMetricsData] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, t, m] = await Promise.all([
      supabase.from('clients').select('*, client_alerts(*)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').order('date'),
    ]);
    setClients(c.data || []);
    setTasks(t.data || []);
    setMeetings(m.data || []);
    setLoading(false);
  }

  // Load client funnel & kpis
  async function loadClientMetrics(clientId: string) {
    const period = new Date().toISOString().slice(0, 7); // "2026-03"
    const [f, k, met] = await Promise.all([
      supabase.from('client_funnel').select('*').eq('client_id', clientId).eq('period', period),
      supabase.from('client_kpis').select('*').eq('client_id', clientId).eq('period', period),
      supabase.from('client_metrics').select('*').eq('client_id', clientId).eq('period', period).single(),
    ]);
    const fd: any = {};
    (f.data || []).forEach((r: any) => { fd[r.step_key] = r.step_value; });
    const kd: any = {};
    (k.data || []).forEach((r: any) => { kd[r.kpi_key] = r.kpi_value; });
    setFunnelData(fd);
    setKpiData(kd);
    setMetricsData(met.data || { spend: 0, revenue: 0, leads: 0, roas: 0 });
  }

  async function saveClientMetrics(clientId: string) {
    const period = new Date().toISOString().slice(0, 7);
    // Save funnel
    for (const [key, value] of Object.entries(funnelData)) {
      await supabase.from('client_funnel').upsert({
        client_id: clientId, period, step_key: key, step_value: Number(value) || 0,
      }, { onConflict: 'client_id,period,step_key' });
    }
    // Save KPIs
    for (const [key, value] of Object.entries(kpiData)) {
      await supabase.from('client_kpis').upsert({
        client_id: clientId, period, kpi_key: key, kpi_value: Number(value) || 0,
      }, { onConflict: 'client_id,period,kpi_key' });
    }
    // Save general metrics
    await supabase.from('client_metrics').upsert({
      client_id: clientId, period,
      spend: Number(metricsData.spend) || 0,
      revenue: Number(metricsData.revenue) || 0,
      leads: Number(metricsData.leads) || 0,
      roas: Number(metricsData.roas) || 0,
    }, { onConflict: 'client_id,period' });
    setEditingMetrics(false);
  }

  // CRUD
  async function addClient() {
    const { data } = await supabase.from('clients').insert({
      ...nc, fee: Number(nc.fee) || 0, status: 'ativo', phase: 'Onboarding', user_id: user.id,
    }).select('*, client_alerts(*)').single();
    if (data) setClients([data, ...clients]);
    setNc({ name: '', squad: 'lancamentos', niche: '', product: '', contact_name: '', contact_phone: '', whatsapp_group: '', fee: '', meta_url: '', google_url: '', analytics_url: '', hotmart_url: '' });
    setShowNew(false);
  }

  async function addTask() {
    const { data } = await supabase.from('tasks').insert({
      ...nt, client_id: nt.client_id || null, due_date: nt.due_date || null, status: 'afazer', user_id: user.id,
    }).select().single();
    if (data) setTasks([data, ...tasks]);
    setNt({ title: '', client_id: '', priority: 'normal', due_date: '' });
    setShowNewTask(false);
  }

  async function addMeeting() {
    const { data } = await supabase.from('meetings').insert({
      ...nm, client_id: nm.client_id || null, user_id: user.id,
    }).select().single();
    if (data) setMeetings([data, ...meetings]);
    setNm({ title: '', client_id: '', date: '', time: '', type: 'Alinhamento', link: '' });
    setShowNewMeeting(false);
  }

  async function updateTask(id: string, updates: any) {
    await supabase.from('tasks').update(updates).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  }

  async function deleteMeeting(id: string) {
    await supabase.from('meetings').delete().eq('id', id);
    setMeetings(meetings.filter(m => m.id !== id));
  }

  async function addNote(clientId: string) {
    if (!noteText.trim()) return;
    await supabase.from('client_notes').insert({ client_id: clientId, text: noteText.trim(), user_id: user.id });
    setNoteText('');
  }

  // Computed
  const active = clients.filter(c => c.status === 'ativo');
  const allAlerts = active.flatMap(c => (c.client_alerts || []).filter((a: any) => !a.resolved).map((a: any) => ({ ...a, cn: c.name })));
  const totalFee = active.reduce((s, c) => s + (c.fee || 0), 0);
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === todayStr);
  const pendingCount = tasks.filter(t => t.status !== 'feito').length;

  const filtered = clients.filter(c => {
    if (squad !== 'todos' && c.squad !== squad) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openC = (c: any) => {
    setSel(c); setPage('client'); setClientTab('info'); setEditingMetrics(false);
    loadClientMetrics(c.id);
  };
  const goHome = () => { setPage('hub'); setSel(null); };
  const logout = async () => { await supabase.auth.signOut(); };

  const genReport = (c: any) => {
    const ft = (FUNNEL_TPL as any)[c.squad] || [];
    const lines = ft.map((f: any) => '▸ ' + f.label + ': ' + fN(funnelData[f.key] || 0)).join('\n');
    const txt = '📊 *' + c.name + '*\n📅 ' + new Date().toLocaleDateString('pt-BR') + '\n\n▸ ' + ((SQUADS as any)[c.squad]?.label || '') + ' · ' + c.phase + '\n\n💰 Invest: ' + fB(metricsData.spend || 0) + '\n📈 Receita: ' + fB(metricsData.revenue || 0) + '\n🔥 ROAS: ' + (metricsData.roas || 0).toFixed(2) + 'x\n\n📊 Funil\n' + lines + '\n\n— APR Digital';
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontFamily: T.fn }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div><span style={{ fontWeight: 600 }}>Carregando...</span></div>
    </div>
  );

  // ═══ SIDEBAR ═══
  const Sidebar = () => (
    <aside style={{ width: 200, minHeight: '100vh', background: 'rgba(255,255,255,0.015)', borderRight: '1px solid ' + T.bdr, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 8 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff' }}>A</div>
        <div><div style={{ fontSize: 12, fontWeight: 800 }}>APR Hub</div><div style={{ fontSize: 8, color: T.mt2 }}>{user.email}</div></div>
      </div>
      {[['hub', '📋', 'Clientes'], ['agenda', '📅', 'Agenda'], ['tasks', '✅', 'Tarefas'], ['financeiro', '💰', 'Financeiro']].map(([p, i, l]) => (
        <button key={p} onClick={() => { setPage(p); setSel(null); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: page === p && !sel ? 'rgba(99,102,241,0.12)' : 'transparent', border: page === p && !sel ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent', borderRadius: 8, cursor: 'pointer', color: page === p && !sel ? '#a5b4fc' : T.mt, fontSize: 11, fontWeight: 600, width: '100%', textAlign: 'left' as const }}>
          <span>{i}</span><span style={{ flex: 1 }}>{l}</span>
          {p === 'tasks' && pendingCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '1px 6px', borderRadius: 4 }}>{pendingCount}</span>}
        </button>
      ))}
      <div style={{ fontSize: 8, fontWeight: 700, color: T.mt2, textTransform: 'uppercase' as const, letterSpacing: '0.1em', padding: '8px 8px 2px' }}>Squads</div>
      {[['todos', '📋', 'Todos', '#a78bfa'], ...Object.entries(SQUADS).map(([k, v]) => [k, v.icon, v.label, v.color])].map(([key, icon, label, color]) => {
        const cnt = key === 'todos' ? clients.length : clients.filter(c => c.squad === key).length;
        const on = squad === key && page === 'hub';
        return (
          <button key={key as string} onClick={() => { setSquad(key as string); setPage('hub'); setSel(null); }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', background: on ? color + '15' : 'transparent', border: on ? '1px solid ' + color + '30' : '1px solid transparent', borderRadius: 7, cursor: 'pointer', color: on ? color as string : T.mt, fontSize: 11, fontWeight: 600, width: '100%', textAlign: 'left' as const }}>
            <span style={{ fontSize: 12 }}>{icon}</span><span style={{ flex: 1 }}>{label}</span>
            <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: 4 }}>{cnt}</span>
          </button>
        );
      })}
      <div style={{ borderTop: '1px solid ' + T.bdr, margin: '6px 0' }} />
      <button onClick={() => setShowNew(true)} style={{ ...btn('#22c55e'), fontSize: 10, padding: '7px 10px', width: '100%' }}>+ Cliente</button>
      <div style={{ marginTop: 'auto', padding: '10px 8px', borderTop: '1px solid ' + T.bdr }}>
        <div style={{ fontSize: 9, color: T.mt2 }}>Fee: <span style={{ color: '#22c55e', fontFamily: T.mo, fontWeight: 700 }}>{fB(totalFee)}</span></div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 10, marginTop: 8 }}>🚪 Sair</button>
      </div>
    </aside>
  );

  // ═══ AGENDA ═══
  if (page === 'agenda') {
    const grouped: Record<string, any[]> = {};
    [...meetings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(m => {
      const d = new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      if (!grouped[d]) grouped[d] = []; grouped[d].push(m);
    });
    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📅 Agenda</h1>
            <button onClick={() => setShowNewMeeting(true)} style={btn('#3b82f6')}>+ Reunião</button>
          </div>
          {Object.entries(grouped).map(([day, evs]) => (
            <div key={day} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#a5b4fc', marginBottom: 8, textTransform: 'capitalize' as const }}>{day}</div>
              {evs.map((m: any) => {
                const cl = clients.find(c => c.id === m.client_id);
                return (
                  <div key={m.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                    <div style={{ fontSize: 12, fontFamily: T.mo, color: '#a5b4fc', fontWeight: 600, minWidth: 50 }}>{m.time?.slice(0, 5)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{m.title}</div>
                      {cl && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: ((SQUADS as any)[cl.squad]?.color || '#a78bfa') + '15', color: (SQUADS as any)[cl.squad]?.color }}>{cl.name}</span>}
                    </div>
                    {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>📹 Entrar</a>}
                    <button onClick={() => deleteMeeting(m.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer' }}>✕</button>
                  </div>
                );
              })}
            </div>
          ))}
          {meetings.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.mt }}>Nenhuma reunião</div>}
        </main>
      </div>
    );
  }

  // ═══ TASKS ═══
  if (page === 'tasks') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>✅ Tarefas</h1>
          <button onClick={() => setShowNewTask(true)} style={btn('#22c55e')}>+ Tarefa</button>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {TASK_COLS.map(col => (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }}
              onDragLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; if (dragTask) { updateTask(dragTask, { status: col.key }); setDragTask(null); } }}
              style={{ flex: 1, background: 'rgba(255,255,255,0.015)', border: '1px solid ' + T.bdr, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{col.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5, color: T.mt, marginLeft: 'auto' }}>{tasks.filter(t => t.status === col.key).length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 80 }}>
                {tasks.filter(t => t.status === col.key).map(t => {
                  const cl = clients.find(c => c.id === t.client_id);
                  const pr = (PRIO as any)[t.priority] || PRIO.normal;
                  return (
                    <div key={t.id} draggable onDragStart={() => setDragTask(t.id)} onDragEnd={() => setDragTask(null)}
                      style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '10px 12px', cursor: 'grab' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{t.title}</span>
                        <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 10 }}>✕</button>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {cl && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ((SQUADS as any)[cl.squad]?.color || '#a78bfa') + '15', color: (SQUADS as any)[cl.squad]?.color }}>{cl.name}</span>}
                        <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pr.bg, color: pr.color }}>{t.priority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  // ═══ FINANCEIRO ═══
  if (page === 'financeiro') return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '20px 24px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>💰 Financeiro</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[{ l: 'Fee Mensal', v: fB(totalFee), c: '#22c55e' }, { l: 'Fee Anual', v: fB(totalFee * 12), c: '#3b82f6' }, { l: 'Clientes Ativos', v: active.length.toString(), c: '#8b5cf6' }].map(k => (
            <div key={k.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.c, opacity: 0.5 }} />
              <div style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{k.l}</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: T.mo, marginTop: 6, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Fee por Cliente</h3>
          {active.sort((a, b) => b.fee - a.fee).map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + T.bdr }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 20, borderRadius: 2, background: (SQUADS as any)[c.squad]?.color || '#a78bfa' }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(c.fee)}/mês</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  // ═══ CLIENT DETAIL ═══
  if (page === 'client' && sel) {
    const c = clients.find(x => x.id === sel.id) || sel;
    const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
    const links = [
      { l: 'Meta Ads', u: c.meta_url, i: '📘', cl: '#3b82f6' },
      { l: 'Google Ads', u: c.google_url, i: '🔍', cl: '#f59e0b' },
      { l: 'Analytics', u: c.analytics_url, i: '📊', cl: '#22c55e' },
      { l: 'Hotmart', u: c.hotmart_url, i: '🔥', cl: '#ef4444' },
      { l: 'WhatsApp', u: c.whatsapp_group, i: '💬', cl: '#25D366' },
    ].filter(x => x.u);
    const clientTasks = tasks.filter(t => t.client_id === c.id);
    const funnelTpl = (FUNNEL_TPL as any)[c.squad] || [];
    const kpiTpl = (KPI_TPL as any)[c.squad] || [];

    return (
      <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
          {/* Top buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            <button onClick={goHome} style={btn('#a78bfa')}>← Hub</button>
            <button onClick={() => genReport(c)} style={btn('#25D366')}>{copied ? '✅ Copiado!' : '📋 WPP'}</button>
          </div>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: sq.color + '20', border: '2px solid ' + sq.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{c.name}</h1>
              <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: sq.color + '20', color: sq.color }}>{sq.icon} {sq.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{c.phase}</span>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: '#22c55e20', color: '#22c55e' }}>{fB(c.fee)}/mês</span>
              </div>
            </div>
          </div>

          {/* Metrics summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { l: 'Invest.', v: fB(metricsData.spend || 0), cl: '#ef4444', k: 'spend' },
              { l: 'Receita', v: fB(metricsData.revenue || 0), cl: '#22c55e', k: 'revenue' },
              { l: 'Leads', v: fN(metricsData.leads || 0), cl: '#3b82f6', k: 'leads' },
              { l: 'ROAS', v: (metricsData.roas || 0).toFixed(2) + 'x', cl: '#f59e0b', k: 'roas' },
            ].map(m => (
              <div key={m.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 11, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.cl, opacity: 0.5 }} />
                <div style={{ fontSize: 9, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{m.l}</div>
                {editingMetrics ? (
                  <input type="number" value={metricsData[m.k] ?? ''} onChange={e => setMetricsData({ ...metricsData, [m.k]: e.target.value })}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 8, padding: '4px 8px', color: T.tx, fontSize: 14, fontFamily: T.mo, outline: 'none', boxSizing: 'border-box' as const, marginTop: 3 }} />
                ) : (
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mo, marginTop: 3, color: m.cl }}>{m.v}</div>
                )}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 1, marginBottom: 14, borderBottom: '1px solid ' + T.bdr, overflowX: 'auto' }}>
            {[
              { id: 'info', l: '📋 Info' },
              { id: 'metricas', l: '📊 Funil & Métricas' },
              { id: 'tarefas', l: '✅ Tarefas' },
              { id: 'notas', l: '📝 Notas' },
            ].map(t => (
              <button key={t.id} onClick={() => setClientTab(t.id)} style={{ background: clientTab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', padding: '7px 14px', cursor: 'pointer', borderBottom: clientTab === t.id ? '2px solid ' + sq.color : '2px solid transparent', color: clientTab === t.id ? T.tx : T.mt, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{t.l}</button>
            ))}
          </div>

          {/* ═══ INFO TAB ═══ */}
          {clientTab === 'info' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Dados</h3>
                {[['Contato', c.contact_name], ['Telefone', c.contact_phone], ['Nicho', c.niche], ['Produto', c.product], ['Fee', c.fee ? fB(c.fee) : '—']].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid ' + T.bdr }}>
                    <span style={{ fontSize: 11, color: T.mt }}>{l}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{v || '—'}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>Acessos</h3>
                {links.map(l => (
                  <a key={l.l} href={l.u} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: l.cl + '10', border: '1px solid ' + l.cl + '25', borderRadius: 10, textDecoration: 'none', color: T.tx, marginBottom: 6 }}>
                    <span>{l.i}</span><span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{l.l}</span><span style={{ fontSize: 11, color: l.cl }}>→</span>
                  </a>
                ))}
                {!links.length && <p style={{ color: T.mt, fontSize: 12 }}>Nenhum link</p>}
              </div>
            </div>
          )}

          {/* ═══ METRICS & FUNNEL TAB ═══ */}
          {clientTab === 'metricas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Edit/Save buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {!editingMetrics ? (
                  <button onClick={() => setEditingMetrics(true)} style={btn('#3b82f6')}>✏️ Editar Métricas</button>
                ) : (
                  <>
                    <button onClick={() => saveClientMetrics(c.id)} style={btn('#22c55e')}>💾 Salvar</button>
                    <button onClick={() => { setEditingMetrics(false); loadClientMetrics(c.id); }} style={btn('#ef4444')}>Cancelar</button>
                  </>
                )}
              </div>

              {/* FUNNEL */}
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px' }}>Funil — {sq.label}</h3>
                <p style={{ fontSize: 11, color: T.mt, margin: '0 0 16px' }}>
                  {c.squad === 'lancamentos' ? 'Impressão → Inscrição → Presença → Venda' :
                   c.squad === 'perpetuo' ? 'Sessão → Produto → Carrinho → Compra' :
                   'Impressão → Lead → Agendamento → Fechamento'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {funnelTpl.map((f: any, i: number) => {
                    const val = funnelData[f.key] || 0;
                    const prevVal = i > 0 ? (funnelData[funnelTpl[i - 1].key] || 0) : val;
                    const pct = i > 0 && prevVal > 0 ? (val / prevVal * 100) : 100;
                    const w = 90 - (60 * i) / (funnelTpl.length - 1);
                    return (
                      <div key={f.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: w + '%', minWidth: 180, background: 'linear-gradient(135deg,' + f.color + 'bb,' + f.color + '44)', border: '1px solid ' + f.color + '33', borderRadius: 10, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{f.label}</span>
                          {editingMetrics ? (
                            <input type="number" value={funnelData[f.key] ?? ''} onChange={e => setFunnelData({ ...funnelData, [f.key]: e.target.value })}
                              style={{ width: 100, textAlign: 'right' as const, fontSize: 14, fontFamily: T.mo, background: 'rgba(0,0,0,0.3)', border: '1px solid ' + T.bdr, borderRadius: 8, padding: '4px 8px', color: T.tx, outline: 'none' }} />
                          ) : (
                            <span style={{ fontSize: 16, fontWeight: 800, fontFamily: T.mo }}>{fN(val)}</span>
                          )}
                        </div>
                        {i > 0 && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: pct > 20 ? '#22c55e' : pct > 5 ? '#f59e0b' : '#ef4444', background: 'rgba(255,255,255,0.03)', padding: '1px 7px', borderRadius: 4 }}>
                            {pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Conversion rates */}
              {funnelTpl.length > 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (funnelTpl.length - 1) + ',1fr)', gap: 10 }}>
                  {funnelTpl.slice(1).map((f: any, i: number) => {
                    const prev = funnelTpl[i];
                    const val = funnelData[f.key] || 0;
                    const prevVal = funnelData[prev.key] || 0;
                    const pct = prevVal > 0 ? (val / prevVal * 100) : 0;
                    return (
                      <div key={f.key} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '12px 8px', textAlign: 'center' as const }}>
                        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.mo, color: pct > 20 ? '#22c55e' : pct > 5 ? '#f59e0b' : '#3b82f6' }}>{pct.toFixed(1)}%</div>
                        <div style={{ fontSize: 8, color: T.mt, marginTop: 3, lineHeight: 1.3 }}>{prev.label} → {f.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* KPIs */}
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px' }}>KPIs — {sq.label}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {kpiTpl.map((k: any) => {
                    const val = kpiData[k.key] || 0;
                    return (
                      <div key={k.key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid ' + T.bdr, borderRadius: 9, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.4 }} />
                        <div style={{ fontSize: 8, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{k.label}</div>
                        {editingMetrics ? (
                          <input type="number" value={kpiData[k.key] ?? ''} onChange={e => setKpiData({ ...kpiData, [k.key]: e.target.value })}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 6, padding: '4px 8px', color: T.tx, fontSize: 14, fontFamily: T.mo, outline: 'none', boxSizing: 'border-box' as const, marginTop: 3 }} />
                        ) : (
                          <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mo, marginTop: 3, color: k.color }}>
                            {k.prefix || ''}{typeof val === 'number' ? val.toLocaleString('pt-BR') : val}{k.suffix || ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Empty state */}
              {Object.keys(funnelData).length === 0 && !editingMetrics && (
                <div style={{ textAlign: 'center' as const, padding: 30, color: T.mt }}>
                  <div style={{ fontSize: 30, marginBottom: 8 }}>📊</div>
                  <p style={{ fontSize: 13, marginBottom: 12 }}>Nenhuma métrica cadastrada para este mês</p>
                  <button onClick={() => setEditingMetrics(true)} style={btn('#6366f1')}>Começar a preencher</button>
                </div>
              )}
            </div>
          )}

          {/* ═══ TASKS TAB ═══ */}
          {clientTab === 'tarefas' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Tarefas</h3>
                <button onClick={() => { setNt({ title: '', client_id: c.id, priority: 'normal', due_date: '' }); setShowNewTask(true); }} style={{ ...btn('#22c55e'), fontSize: 10, padding: '6px 12px' }}>+ Tarefa</button>
              </div>
              {clientTasks.length === 0 ? <p style={{ color: T.mt, fontSize: 12 }}>Nenhuma tarefa</p> : clientTasks.map(t => {
                const pr = (PRIO as any)[t.priority]; const col = TASK_COLS.find(x => x.key === t.status);
                return (
                  <div key={t.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col?.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{t.title}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: pr?.bg, color: pr?.color }}>{t.priority}</span>
                    <select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value })} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid ' + T.bdr, borderRadius: 6, padding: '3px 6px', color: T.tx, fontSize: 10, outline: 'none' }}>
                      {TASK_COLS.map(c => <option key={c.key} value={c.key} style={{ background: '#1a1a2e' }}>{c.label}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ NOTES TAB ═══ */}
          {clientTab === 'notas' && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>📝 Notas</h3>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ata de reunião..." rows={3} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '10px 14px', color: T.tx, fontSize: 13, outline: 'none', resize: 'vertical' as const, fontFamily: T.fn }} />
                <button onClick={() => addNote(c.id)} disabled={!noteText.trim()} style={{ ...btn('#22c55e'), alignSelf: 'flex-end', opacity: noteText.trim() ? 1 : 0.4 }}>Salvar</button>
              </div>
              <p style={{ color: T.mt, fontSize: 12 }}>Notas salvas no banco de dados e visíveis para toda a equipe.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // ═══ HUB MAIN ═══
  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '20px 24px', overflowY: 'auto', maxHeight: '100vh' }}>
        {!dailyOff && (
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.04))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: '18px 22px', marginBottom: 18, position: 'relative' }}>
            <button onClick={() => setDailyOff(true)} style={{ position: 'absolute', top: 8, right: 10, background: 'none', border: 'none', color: T.mt, cursor: 'pointer' }}>✕</button>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6 }}>{greet}, Ana Paula! 👋</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              <b style={{ color: T.tx }}>{active.length} clientes</b> · Fee: <b style={{ color: '#22c55e' }}>{fB(totalFee)}/mês</b>
              {allAlerts.length > 0 && <span> · <b style={{ color: '#fca5a5' }}>{allAlerts.length} alerta{allAlerts.length > 1 ? 's' : ''}</b></span>}
              {todayMeetings.length > 0 && <span> · <b style={{ color: '#a5b4fc' }}>{todayMeetings.length} reunião hoje</b></span>}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>{squad === 'todos' ? '📋 Clientes' : (SQUADS as any)[squad]?.icon + ' ' + (SQUADS as any)[squad]?.label}</h1>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 7, padding: '5px 10px', color: T.tx, fontSize: 11, outline: 'none', width: 160 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtered.map(c => {
            const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
            const alerts = (c.client_alerts || []).filter((a: any) => !a.resolved);
            return (
              <div key={c.id} onClick={() => openC(c)} style={{ background: T.card, border: '1px solid ' + (alerts.length ? 'rgba(239,68,68,0.2)' : T.bdr), borderRadius: 13, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', opacity: c.status === 'pausado' ? 0.4 : 1 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: sq.color, opacity: 0.4 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: sq.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 9, color: T.mt }}>{c.niche}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sq.color + '15', color: sq.color }}>{sq.icon} {sq.label}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{c.phase}</span>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#22c55e15', color: '#22c55e' }}>{fB(c.fee)}</span>
                </div>
                {alerts.length > 0 && <div style={{ marginTop: 4 }}>{alerts.map((a: any) => <span key={a.id} style={{ fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', marginRight: 3 }}>⚠️ {a.message?.slice(0, 30)}</span>)}</div>}
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.mt }}>Nenhum cliente</div>}
      </main>

      {/* MODALS */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 26, width: 460, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>+ Novo Cliente</h2>
            {[{ k: 'name', l: 'Nome' }, { k: 'niche', l: 'Nicho' }, { k: 'product', l: 'Produto' }, { k: 'contact_name', l: 'Contato' }, { k: 'contact_phone', l: 'Telefone' }, { k: 'whatsapp_group', l: 'WhatsApp' }, { k: 'fee', l: 'Fee (R$)', t: 'number' }, { k: 'meta_url', l: 'Meta Ads' }, { k: 'google_url', l: 'Google Ads' }, { k: 'analytics_url', l: 'Analytics' }, { k: 'hotmart_url', l: 'Hotmart' }].map(f => (
              <div key={f.k} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2, textTransform: 'uppercase' as const }}>{f.l}</label>
                <input type={f.t || 'text'} value={(nc as any)[f.k] || ''} onChange={e => setNc({ ...nc, [f.k]: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 4, textTransform: 'uppercase' as const }}>Squad</label>
              <div style={{ display: 'flex', gap: 3 }}>
                {Object.entries(SQUADS).map(([k, v]) => (
                  <button key={k} onClick={() => setNc({ ...nc, squad: k })} style={{ flex: 1, padding: 7, borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 600, background: nc.squad === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: nc.squad === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: nc.squad === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={addClient} disabled={!nc.name} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: nc.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nc.name ? '#fff' : T.mt, cursor: nc.name ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {showNewTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewTask(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 26, width: 400 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>+ Nova Tarefa</h2>
            <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>TÍTULO</label><input value={nt.title} onChange={e => setNt({ ...nt, title: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} /></div>
            <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>CLIENTE</label><select value={nt.client_id} onChange={e => setNt({ ...nt, client_id: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none' }}><option value="" style={{ background: '#1a1a2e' }}>Geral</option>{clients.filter(c => c.status === 'ativo').map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name}</option>)}</select></div>
            <div style={{ marginBottom: 8 }}><label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>PRIORIDADE</label><div style={{ display: 'flex', gap: 4 }}>{['urgente', 'normal', 'baixa'].map(p => <button key={p} onClick={() => setNt({ ...nt, priority: p })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: nt.priority === p ? (PRIO as any)[p].bg : 'rgba(255,255,255,0.03)', border: nt.priority === p ? '1px solid ' + (PRIO as any)[p].color + '40' : '1px solid ' + T.bdr, color: nt.priority === p ? (PRIO as any)[p].color : T.mt, textTransform: 'capitalize' as const }}>{p}</button>)}</div></div>
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>PRAZO</label><input type="date" value={nt.due_date} onChange={e => setNt({ ...nt, due_date: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} /></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewTask(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={addTask} disabled={!nt.title} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: nt.title ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nt.title ? '#fff' : T.mt, cursor: nt.title ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {showNewMeeting && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewMeeting(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 26, width: 400 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>+ Nova Reunião</h2>
            {[{ k: 'title', l: 'Título' }, { k: 'date', l: 'Data', t: 'date' }, { k: 'time', l: 'Horário', t: 'time' }, { k: 'link', l: 'Link Meet/Zoom' }].map(f => (
              <div key={f.k} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>{f.l.toUpperCase()}</label>
                <input type={f.t || 'text'} value={(nm as any)[f.k] || ''} onChange={e => setNm({ ...nm, [f.k]: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}><label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>CLIENTE</label><select value={nm.client_id} onChange={e => setNm({ ...nm, client_id: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none' }}><option value="" style={{ background: '#1a1a2e' }}>Geral</option>{clients.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name}</option>)}</select></div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewMeeting(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={addMeeting} disabled={!nm.title || !nm.date} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: nm.title && nm.date ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nm.title && nm.date ? '#fff' : T.mt, cursor: nm.title && nm.date ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
