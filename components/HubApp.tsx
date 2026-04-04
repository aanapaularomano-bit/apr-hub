'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SQUADS, PHASES, FUNNEL_TPL, KPI_TPL, TASK_COLS, PRIO, THEME as T, fB, fN, ONBOARDING_ITEMS } from '@/lib/constants';
import Financeiro from './Financeiro';
import Prospects from './Prospects';
import BancoEstrategias from './BancoEstrategias';
import DashboardManager from './DashboardManager';
import ProximasAcoes from './ProximasAcoes';

const btnS = (color: string, extra?: any) => ({
  background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10,
  padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra,
});
const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };

export default function HubApp({ user }: { user: any }) {
  const [clients, setClients] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState('alice');
  const [squad, setSquad] = useState('todos');
  const [sel, setSel] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
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
  const [editingMetrics, setEditingMetrics] = useState(false);
  const [editingClient, setEditingClient] = useState(false);
  const [editClient, setEditClient] = useState<any>({});
  const [funnelData, setFunnelData] = useState<any>({});
  const [kpiData, setKpiData] = useState<any>({});
  const [metricsData, setMetricsData] = useState<any>({});
  const [clientNotes, setClientNotes] = useState<any[]>([]);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({ type: 'error', message: '' });
  const [dailyCopied, setDailyCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>({});
  const [crmData, setCrmData] = useState<any>({});
  const [editingCrm, setEditingCrm] = useState(false);
  const [formLink, setFormLink] = useState('');
  const [formData, setFormData] = useState<any>(null);
  const [formCopied, setFormCopied] = useState(false);
  const [logEntries, setLogEntries] = useState<any[]>([]);
  const [newLog, setNewLog] = useState({ action: '', category: 'otimizacao' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, t, m] = await Promise.all([
      supabase.from('clients').select('*, client_alerts(*)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('meetings').select('*').order('date'),
    ]);
    setClients(c.data || []); setTasks(t.data || []); setMeetings(m.data || []); setLoading(false);
  }

  async function loadClientMetrics(cid: string) {
    const period = new Date().toISOString().slice(0, 7);
    const [f, k, met, notes] = await Promise.all([
      supabase.from('client_funnel').select('*').eq('client_id', cid).eq('period', period),
      supabase.from('client_kpis').select('*').eq('client_id', cid).eq('period', period),
      supabase.from('client_metrics').select('*').eq('client_id', cid).eq('period', period).maybeSingle(),
      supabase.from('client_notes').select('*').eq('client_id', cid).order('created_at', { ascending: false }),
    ]);
    const fd: any = {}; (f.data || []).forEach((r: any) => { fd[r.step_key] = r.step_value; });
    const kd: any = {}; (k.data || []).forEach((r: any) => { kd[r.kpi_key] = r.kpi_value; });
    setFunnelData(fd); setKpiData(kd);
    setMetricsData(met.data || { spend: 0, revenue: 0, leads: 0, roas: 0 });
    setClientNotes(notes.data || []);
    // Load onboarding checklist
    const { data: onbData } = await supabase.from('client_kpis').select('*').eq('client_id', cid).like('kpi_key', 'onb_%');
    const od: any = {}; (onbData || []).forEach((r: any) => { od[r.kpi_key.replace('onb_', '')] = r.kpi_value === 1; });
    setOnboardingData(od);
    // Load CRM data
    const { data: crmD } = await supabase.from('client_kpis').select('*').eq('client_id', cid).like('kpi_key', 'crm_%');
    const cd: any = {}; (crmD || []).forEach((r: any) => { cd[r.kpi_key.replace('crm_', '')] = r.kpi_value === 0 ? '' : String(r.kpi_value); });
    // Also load text CRM fields from client_notes with special prefix
    const { data: crmNotes } = await supabase.from('client_notes').select('*').eq('client_id', cid).like('text', 'CRM_FIELD:%');
    (crmNotes || []).forEach((n: any) => { const parts = n.text.split(':'); if (parts.length >= 3) { cd[parts[1]] = parts.slice(2).join(':'); } });
    setCrmData(cd);
  }

  async function addLogEntry(cid: string) {
    if (!newLog.action.trim()) return;
    const text = 'LOG:' + newLog.category + ':' + newLog.action.trim();
    await supabase.from('client_notes').insert({ client_id: cid, text, user_id: user.id });
    setNewLog({ action: '', category: 'otimizacao' });
    // Reload logs
    const { data } = await supabase.from('client_notes').select('*').eq('client_id', cid).like('text', 'LOG:%').order('created_at', { ascending: false });
    setLogEntries(data || []);
  }

  async function loadLogs(cid: string) {
    const { data } = await supabase.from('client_notes').select('*').eq('client_id', cid).like('text', 'LOG:%').order('created_at', { ascending: false });
    setLogEntries(data || []);
  }

  async function deleteLogEntry(id: string, cid: string) {
    await supabase.from('client_notes').delete().eq('id', id);
    setLogEntries(logEntries.filter(l => l.id !== id));
  }

  async function toggleOnboarding(cid: string, key: string, checked: boolean) {
    const newData = { ...onboardingData, [key]: checked };
    setOnboardingData(newData);
    await supabase.from('client_kpis').upsert({ client_id: cid, period: 'onboarding', kpi_key: 'onb_' + key, kpi_value: checked ? 1 : 0 }, { onConflict: 'client_id,period,kpi_key' });
  }

  async function saveCrmData(cid: string) {
    const textFields = ['endereco', 'instagram_site', 'produto_servico', 'publico_alvo', 'objetivos', 'concorrentes', 'historico', 'dados_bancarios', 'tipo_cobranca'];
    for (const key of textFields) {
      if (crmData[key]) {
        // Delete old note if exists
        await supabase.from('client_notes').delete().eq('client_id', cid).like('text', 'CRM_FIELD:' + key + ':%');
        await supabase.from('client_notes').insert({ client_id: cid, text: 'CRM_FIELD:' + key + ':' + crmData[key], user_id: user.id });
      }
    }
    // Numeric fields
    const numFields = ['orcamento_trafego', 'fee_acordado'];
    for (const key of numFields) {
      await supabase.from('client_kpis').upsert({ client_id: cid, period: 'crm', kpi_key: 'crm_' + key, kpi_value: Number(crmData[key]) || 0 }, { onConflict: 'client_id,period,kpi_key' });
    }
    setEditingCrm(false);
  }

  async function generateFormLink(cid: string) {
    const code = cid.slice(0, 8) + Date.now().toString(36);
    // Check if form already exists
    const { data: existing } = await supabase.from('client_forms').select('*').eq('client_id', cid).order('created_at', { ascending: false }).limit(1);
    if (existing && existing.length > 0) {
      setFormLink(window.location.origin + '/form/' + existing[0].form_code);
      setFormData(existing[0]);
      return;
    }
    const { data } = await supabase.from('client_forms').insert({ client_id: cid, form_code: code }).select().single();
    if (data) {
      setFormLink(window.location.origin + '/form/' + code);
      setFormData(data);
    }
  }

  async function loadFormData(cid: string) {
    const { data } = await supabase.from('client_forms').select('*').eq('client_id', cid).order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      setFormData(data[0]);
      setFormLink(window.location.origin + '/form/' + data[0].form_code);
    } else {
      setFormData(null);
      setFormLink('');
    }
  }

  async function saveClientMetrics(cid: string) {
    const period = new Date().toISOString().slice(0, 7);
    for (const [key, value] of Object.entries(funnelData)) {
      await supabase.from('client_funnel').upsert({ client_id: cid, period, step_key: key, step_value: Number(value) || 0 }, { onConflict: 'client_id,period,step_key' });
    }
    for (const [key, value] of Object.entries(kpiData)) {
      await supabase.from('client_kpis').upsert({ client_id: cid, period, kpi_key: key, kpi_value: Number(value) || 0 }, { onConflict: 'client_id,period,kpi_key' });
    }
    await supabase.from('client_metrics').upsert({ client_id: cid, period, spend: Number(metricsData.spend) || 0, revenue: Number(metricsData.revenue) || 0, leads: Number(metricsData.leads) || 0, roas: Number(metricsData.roas) || 0 }, { onConflict: 'client_id,period' });
    setEditingMetrics(false);
  }

  async function addClient() {
    if (!nc.name) return;
    const { data } = await supabase.from('clients').insert({ ...nc, fee: Number(nc.fee) || 0, status: 'ativo', phase: 'Onboarding', user_id: user.id }).select('*, client_alerts(*)').single();
    if (data) setClients([data, ...clients]);
    setNc({ name: '', squad: 'lancamentos', niche: '', product: '', contact_name: '', contact_phone: '', whatsapp_group: '', fee: '', meta_url: '', google_url: '', analytics_url: '', hotmart_url: '' });
    setShowNew(false);
  }

  async function saveClient() {
    if (!sel) return;
    const updates = { name: editClient.name, niche: editClient.niche, product: editClient.product, contact_name: editClient.contact_name, contact_phone: editClient.contact_phone, whatsapp_group: editClient.whatsapp_group, fee: Number(editClient.fee) || 0, meta_url: editClient.meta_url, google_url: editClient.google_url, analytics_url: editClient.analytics_url, hotmart_url: editClient.hotmart_url, phase: editClient.phase, status: editClient.status, squad: editClient.squad };
    await supabase.from('clients').update(updates).eq('id', sel.id);
    setClients(clients.map(c => c.id === sel.id ? { ...c, ...updates } : c));
    setSel({ ...sel, ...updates });
    setEditingClient(false);
  }

  async function deleteClient(id: string) {
    await supabase.from('clients').delete().eq('id', id);
    setClients(clients.filter(c => c.id !== id));
    setPage('hub'); setSel(null);
  }

  async function addTask() {
    const { data } = await supabase.from('tasks').insert({ ...nt, client_id: nt.client_id || null, due_date: nt.due_date || null, status: 'afazer', user_id: user.id }).select().single();
    if (data) setTasks([data, ...tasks]);
    setNt({ title: '', client_id: '', priority: 'normal', due_date: '' }); setShowNewTask(false);
  }
  async function addMeeting() {
    const { data } = await supabase.from('meetings').insert({ ...nm, client_id: nm.client_id || null, user_id: user.id }).select().single();
    if (data) setMeetings([data, ...meetings]);
    setNm({ title: '', client_id: '', date: '', time: '', type: 'Alinhamento', link: '' }); setShowNewMeeting(false);
  }
  async function updateTask(id: string, u: any) { await supabase.from('tasks').update(u).eq('id', id); setTasks(tasks.map(t => t.id === id ? { ...t, ...u } : t)); }
  async function deleteTask(id: string) { await supabase.from('tasks').delete().eq('id', id); setTasks(tasks.filter(t => t.id !== id)); }
  async function deleteMeeting(id: string) { await supabase.from('meetings').delete().eq('id', id); setMeetings(meetings.filter(m => m.id !== id)); }
  async function addNote(cid: string) {
    if (!noteText.trim()) return;
    await supabase.from('client_notes').insert({ client_id: cid, text: noteText.trim(), user_id: user.id });
    setNoteText('');
    const { data } = await supabase.from('client_notes').select('*').eq('client_id', cid).order('created_at', { ascending: false });
    setClientNotes(data || []);
  }
  async function deleteNote(id: string) { await supabase.from('client_notes').delete().eq('id', id); setClientNotes(clientNotes.filter(n => n.id !== id)); }

  async function addAlert(cid: string) {
    if (!newAlert.message) return;
    const { data } = await supabase.from('client_alerts').insert({ client_id: cid, type: newAlert.type, message: newAlert.message }).select().single();
    if (data) {
      setClients(clients.map(c => c.id === cid ? { ...c, client_alerts: [...(c.client_alerts || []), data] } : c));
      if (sel?.id === cid) setSel({ ...sel, client_alerts: [...(sel.client_alerts || []), data] });
    }
    setNewAlert({ type: 'error', message: '' }); setShowNewAlert(false);
  }

  async function resolveAlert(alertId: string, cid: string) {
    await supabase.from('client_alerts').update({ resolved: true }).eq('id', alertId);
    setClients(clients.map(c => c.id === cid ? { ...c, client_alerts: (c.client_alerts || []).map((a: any) => a.id === alertId ? { ...a, resolved: true } : a) } : c));
    if (sel?.id === cid) setSel({ ...sel, client_alerts: (sel.client_alerts || []).map((a: any) => a.id === alertId ? { ...a, resolved: true } : a) });
  }

  function copyDailyReport() {
    const date = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    let txt = '📋 *APR Digital — Resumo do Dia*\n📅 ' + date + '\n\n';
    txt += '👥 *' + active.length + ' clientes ativos* · Fee: ' + fB(totalFee) + '/mês\n\n';
    if (allAlerts.length > 0) {
      txt += '🚨 *ALERTAS (' + allAlerts.length + ')*\n';
      allAlerts.forEach(a => { txt += '▸ *' + a.cn + '*: ' + a.message + '\n'; });
      txt += '\n';
    }
    if (todayMeetings.length > 0) {
      txt += '📅 *REUNIÕES HOJE*\n';
      todayMeetings.forEach(m => { const cl = clients.find(c => c.id === m.client_id); txt += '▸ ' + (m.time?.slice(0, 5) || '') + ' — ' + m.title + (cl ? ' (' + cl.name + ')' : '') + '\n'; });
      txt += '\n';
    }
    const todayTasks = tasks.filter(t => t.status !== 'feito' && (t.due_date === todayStr || (t.due_date && t.due_date < todayStr)));
    if (todayTasks.length > 0) {
      txt += '✅ *TAREFAS DO DIA (' + todayTasks.length + ')*\n';
      todayTasks.forEach(t => { const cl = clients.find(c => c.id === t.client_id); const od = t.due_date && t.due_date < todayStr; txt += (od ? '🔴 ' : '▸ ') + t.title + (cl ? ' (' + cl.name + ')' : '') + (od ? ' ⚠️ ATRASADA' : '') + '\n'; });
      txt += '\n';
    }
    if (urgentTasks.length > 0) {
      txt += '🔥 *URGENTES*\n';
      urgentTasks.forEach(t => { txt += '▸ ' + t.title + '\n'; });
      txt += '\n';
    }
    txt += '— APR Digital Hub';
    navigator.clipboard.writeText(txt).then(() => { setDailyCopied(true); setTimeout(() => setDailyCopied(false), 2000); });
  }

  const active = clients.filter(c => c.status === 'ativo');
  const allAlerts = active.flatMap(c => (c.client_alerts || []).filter((a: any) => !a.resolved).map((a: any) => ({ ...a, cn: c.name })));
  const totalFee = active.reduce((s, c) => s + (c.fee || 0), 0);
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Bom dia' : hr < 18 ? 'Boa tarde' : 'Boa noite';
  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeetings = meetings.filter(m => m.date === todayStr).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const urgentTasks = tasks.filter(t => t.status !== 'feito' && t.priority === 'urgente');
  const pendingCount = tasks.filter(t => t.status !== 'feito').length;
  const overdueTasks = tasks.filter(t => t.status !== 'feito' && t.due_date && t.due_date < todayStr);
  const todayTasks = tasks.filter(t => t.status !== 'feito' && t.due_date === todayStr);
  const filtered = clients.filter(c => {
    if (squad !== 'todos' && c.squad !== squad) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'alerts') return (c.client_alerts || []).some((a: any) => !a.resolved);
    return true;
  });
  const openC = (c: any) => { setSel(c); setPage('client'); setClientTab('log'); setEditingMetrics(false); setEditingClient(false); setEditClient(c); setEditingCrm(false); loadClientMetrics(c.id); loadFormData(c.id); loadLogs(c.id); };
  const goHome = () => { setPage('hub'); setSel(null); setEditingClient(false); };
  const logout = async () => { await supabase.auth.signOut(); };
  const genReport = (c: any) => {
    const ft = (FUNNEL_TPL as any)[c.squad] || [];
    const lines = ft.map((f: any) => '▸ ' + f.label + ': ' + fN(funnelData[f.key] || 0)).join('\n');
    const txt = '📊 *' + c.name + '*\n📅 ' + new Date().toLocaleDateString('pt-BR') + '\n\n▸ ' + ((SQUADS as any)[c.squad]?.label || '') + ' · ' + c.phase + '\n💰 Fee: ' + fB(c.fee) + '/mês\n\n💰 Invest: ' + fB(metricsData.spend || 0) + '\n📈 Receita: ' + fB(metricsData.revenue || 0) + '\n🔥 ROAS: ' + (Number(metricsData.roas) || 0).toFixed(2) + 'x\n\n📊 Funil\n' + lines + '\n\n— APR Digital';
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (loading) return (<div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', fontFamily: T.fn }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div><span style={{ fontWeight: 600, fontSize: 18 }}>Carregando APR Hub...</span></div></div>);

  // ═══ SIDEBAR ═══
  const navBtn = (p: string, i: string, l: string, badge?: number) => (
    <button key={p} onClick={() => { setPage(p); setSel(null); }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: page === p && !sel ? 'rgba(99,102,241,0.12)' : 'transparent', border: page === p && !sel ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent', borderRadius: 9, cursor: 'pointer', color: page === p && !sel ? '#a5b4fc' : T.mt, fontSize: 14, fontWeight: 600, width: '100%', textAlign: 'left' as const }}>
      <span style={{ fontSize: 16 }}>{i}</span><span style={{ flex: 1 }}>{l}</span>
      {badge !== undefined && badge > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '2px 7px', borderRadius: 5 }}>{badge}</span>}
    </button>
  );
  const sectionLabel = (text: string) => (
    <div style={{ fontSize: 12, fontWeight: 700, color: T.mt2, textTransform: 'uppercase' as const, letterSpacing: '0.12em', padding: '14px 8px 6px' }}>{text}</div>
  );

  const sidebar = (
    <aside style={{ width: 240, minHeight: '100vh', background: 'rgba(255,255,255,0.015)', borderRight: '1px solid ' + T.bdr, padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>A</div>
        <div><div style={{ fontSize: 16, fontWeight: 800 }}>APR Hub</div><div style={{ fontSize: 11, color: T.mt2, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{user.email}</div></div>
      </div>

      {navBtn('alice', '🤖', 'Alice', allAlerts.length + overdueTasks.length)}

      {sectionLabel('CRM')}
      {navBtn('prospects', '🎯', 'Prospects')}
      {navBtn('hub', '📋', 'Clientes Ativos')}
      {navBtn('crm', '🏢', 'Onboarding')}

      {sectionLabel('Operação')}
      {navBtn('tasks', '✅', 'Tarefas', pendingCount)}
      {navBtn('agenda', '📅', 'Agenda', todayMeetings.length)}
      {navBtn('estrategias', '📚', 'Estratégias')}
      {navBtn('dashboards', '📊', 'Dashboards')}

      <div style={{ borderTop: '1px solid ' + T.bdr, margin: '8px 0' }} />
      {navBtn('financeiro', '💰', 'Financeiro')}

      <div style={{ borderTop: '1px solid ' + T.bdr, margin: '6px 0' }} />

      {sectionLabel('Squads')}
      {[['todos', '📋', 'Todos', '#a78bfa'], ...Object.entries(SQUADS).map(([k, v]) => [k, v.icon, v.label, v.color])].map(([key, icon, label, color]) => {
        const cnt = key === 'todos' ? clients.length : clients.filter(c => c.squad === key).length;
        const on = squad === key && page === 'hub' && !sel;
        return (
          <button key={key as string} onClick={() => { setSquad(key as string); setPage('hub'); setSel(null); setFilter('all'); }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', background: on ? color + '15' : 'transparent', border: on ? '1px solid ' + color + '30' : '1px solid transparent', borderRadius: 8, cursor: 'pointer', color: on ? color as string : T.mt, fontSize: 13, fontWeight: 600, width: '100%', textAlign: 'left' as const }}>
            <span style={{ fontSize: 15 }}>{icon}</span><span style={{ flex: 1 }}>{label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 5 }}>{cnt}</span>
          </button>
        );
      })}

      <div style={{ borderTop: '1px solid ' + T.bdr, margin: '8px 0' }} />
      <button onClick={() => setShowNew(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 9, cursor: 'pointer', color: '#22c55e', fontSize: 14, fontWeight: 600, width: '100%' }}>+ Novo Cliente</button>

      <div style={{ marginTop: 'auto', padding: '14px 8px', borderTop: '1px solid ' + T.bdr }}>
        <div style={{ fontSize: 12, color: T.mt2, marginBottom: 4 }}>Fee: <span style={{ color: '#22c55e', fontFamily: T.mo, fontWeight: 700 }}>{fB(totalFee)}</span></div>
        <div style={{ fontSize: 12, color: T.mt2, marginBottom: 10 }}>Clientes: <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{active.length} ativos</span></div>
        <button onClick={logout} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9, padding: '10px 14px', color: '#fca5a5', cursor: 'pointer', fontSize: 15, fontWeight: 700, width: '100%' }}>🚪 Sair</button>
      </div>
    </aside>
  );

  // ═══ CLIENT FIELDS (shared between new + edit) ═══
  const clientFields = [{ k: 'name', l: 'Nome' }, { k: 'niche', l: 'Nicho' }, { k: 'product', l: 'Produto' }, { k: 'contact_name', l: 'Contato' }, { k: 'contact_phone', l: 'Telefone' }, { k: 'whatsapp_group', l: 'WhatsApp' }, { k: 'fee', l: 'Fee (R$)', t: 'number' }, { k: 'meta_url', l: 'Meta Ads URL' }, { k: 'google_url', l: 'Google Ads URL' }, { k: 'analytics_url', l: 'Analytics URL' }, { k: 'hotmart_url', l: 'Hotmart URL' }];

  // ═══ ALICE — Chat function ═══
  async function sendChat() {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    const context = `Você é a Alice, assistente IA da APR Digital. Responda em português do Brasil, de forma objetiva e útil.

DADOS DA AGÊNCIA AGORA:
- ${active.length} clientes ativos
- Fee total: R$ ${totalFee.toLocaleString('pt-BR')}/mês
- ${pendingCount} tarefas pendentes
- ${allAlerts.length} alertas ativos
- ${todayMeetings.length} reuniões hoje
- ${overdueTasks.length} tarefas atrasadas

CLIENTES:
${clients.map(c => `• ${c.name} — ${(SQUADS as any)[c.squad]?.label || c.squad} — ${c.phase} — Fee: R$${c.fee} — Status: ${c.status}${c.niche ? ' — Nicho: ' + c.niche : ''}`).join('\n')}

ALERTAS ATIVOS:
${allAlerts.length > 0 ? allAlerts.map(a => `• ${a.cn}: ${a.message} (${a.type})`).join('\n') : 'Nenhum'}

TAREFAS PENDENTES:
${tasks.filter(t => t.status !== 'feito').slice(0, 15).map(t => { const cl = clients.find(c => c.id === t.client_id); return `• ${t.title}${cl ? ' (' + cl.name + ')' : ''} — ${t.priority} — ${t.status}${t.due_date ? ' — Prazo: ' + t.due_date : ''}`; }).join('\n')}

REUNIÕES HOJE:
${todayMeetings.length > 0 ? todayMeetings.map(m => { const cl = clients.find(c => c.id === m.client_id); return `• ${m.time?.slice(0, 5)} — ${m.title}${cl ? ' (' + cl.name + ')' : ''}`; }).join('\n') : 'Nenhuma'}

Responda a pergunta da Ana Paula sobre a agência.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: context + '\n\nPergunta: ' + userMsg }
          ],
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text || 'Desculpe, não consegui processar. Tente novamente.';
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao conectar com a IA. Verifique a conexão.' }]);
    }
    setChatLoading(false);
  }

  // ═══ ALICE PAGE ═══
  if (page === 'alice') {
    const todayTasks = tasks.filter(t => t.status !== 'feito' && t.due_date === todayStr);
    return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Alice — Central de Comando</h1>
          <div style={{ fontSize: 13, color: T.mt2 }}>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
        <button onClick={copyDailyReport} style={{ ...btnS(dailyCopied ? '#22c55e' : '#a5b4fc', { fontSize: 12, padding: '8px 14px' }), marginLeft: 'auto' }}>{dailyCopied ? '✅ Copiado!' : '📋 Copiar Resumo WPP'}</button>
      </div>

      {/* Resumo rápido */}
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.8, marginBottom: 18 }}>
        {greet}, Ana Paula! Você tem <b style={{ color: T.tx }}>{active.length} clientes ativos</b> com fee de <b style={{ color: '#22c55e' }}>{fB(totalFee)}/mês</b>.
        {allAlerts.length > 0 && <span> <b style={{ color: '#fca5a5' }}>{allAlerts.length} alerta{allAlerts.length > 1 ? 's' : ''}</b> precisam de atenção.</span>}
        {overdueTasks.length > 0 && <span> <b style={{ color: '#ef4444' }}>{overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} atrasada{overdueTasks.length > 1 ? 's' : ''}</b>.</span>}
        {todayMeetings.length > 0 && <span> <b style={{ color: '#a5b4fc' }}>{todayMeetings.length} reunião{todayMeetings.length > 1 ? 'ões' : ''} hoje</b>.</span>}
        {allAlerts.length === 0 && overdueTasks.length === 0 && <span> Tudo tranquilo hoje! ✨</span>}
      </div>

      {/* 3 colunas: Alertas, Reuniões, Tarefas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 22 }}>
        {/* Alertas */}
        <div style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', marginBottom: 10 }}>🚨 Alertas ({allAlerts.length})</div>
          {allAlerts.length === 0 ? <div style={{ fontSize: 14, color: T.mt }}>Nenhum alerta ✨</div> :
            allAlerts.slice(0, 6).map((a, i) => (
              <div key={'al' + i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: a.type === 'error' ? '#ef4444' : '#f59e0b', flexShrink: 0, fontSize: 14 }}>{a.type === 'error' ? '🔴' : '🟡'}</span>
                <div style={{ flex: 1 }}>
                  <b style={{ color: T.tx, fontSize: 13 }}>{a.cn}</b>
                  <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>{a.message}</div>
                </div>
              </div>
            ))}
        </div>

        {/* Reuniões */}
        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#a5b4fc', marginBottom: 10 }}>📅 Reuniões Hoje ({todayMeetings.length})</div>
          {todayMeetings.length === 0 ? <div style={{ fontSize: 14, color: T.mt }}>Nenhuma reunião</div> :
            todayMeetings.slice(0, 6).map((m, i) => {
              const cl = clients.find(c => c.id === m.client_id);
              return (<div key={'mt' + i} style={{ fontSize: 13, marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#a5b4fc', fontFamily: T.mo, fontWeight: 700, fontSize: 13, minWidth: 50 }}>{m.time?.slice(0, 5)}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{m.title}</div>{cl && <div style={{ fontSize: 12, color: T.mt }}>{cl.name}</div>}</div>
                {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ color: '#22c55e', textDecoration: 'none', fontSize: 12, fontWeight: 600 }}>📹</a>}
              </div>);
            })}
        </div>

        {/* Tarefas do dia */}
        <div style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.12)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fcd34d', marginBottom: 10 }}>✅ Tarefas do Dia ({todayTasks.length + overdueTasks.length})</div>
          {todayTasks.length === 0 && overdueTasks.length === 0 ? <div style={{ fontSize: 14, color: T.mt }}>Tudo em dia! 🎉</div> : <>
            {overdueTasks.slice(0, 4).map((t, i) => {
              const cl = clients.find(c => c.id === t.client_id);
              return (<div key={'od' + i} style={{ fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#ef4444', fontSize: 14 }}>🔴</span>
                <div style={{ flex: 1 }}><div style={{ color: '#fca5a5', fontWeight: 600 }}>{t.title}</div>{cl && <div style={{ fontSize: 12, color: T.mt }}>{cl.name} · ATRASADA</div>}</div>
              </div>);
            })}
            {todayTasks.slice(0, 4).map((t, i) => {
              const cl = clients.find(c => c.id === t.client_id);
              return (<div key={'td' + i} style={{ fontSize: 13, marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#f59e0b', fontSize: 14 }}>🟡</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600 }}>{t.title}</div>{cl && <div style={{ fontSize: 12, color: T.mt }}>{cl.name}</div>}</div>
              </div>);
            })}
          </>}
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 22 }}>
        {[{ l: 'Clientes', v: active.length.toString(), c: '#a78bfa', icon: '👥' }, { l: 'Fee Mensal', v: fB(totalFee), c: '#22c55e', icon: '💰' }, { l: 'Pendentes', v: pendingCount.toString(), c: pendingCount > 5 ? '#f59e0b' : '#3b82f6', icon: '✅' }, { l: 'Alertas', v: allAlerts.length.toString(), c: allAlerts.length > 0 ? '#ef4444' : '#22c55e', icon: allAlerts.length > 0 ? '🚨' : '✨' }].map(k => (
          <div key={k.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.c, opacity: 0.4 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 11, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{k.l}</span><span style={{ fontSize: 16 }}>{k.icon}</span></div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: T.mo, marginTop: 5, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Chat IA */}
      <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 250 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Pergunte à Alice</h3>
          <span style={{ fontSize: 12, color: T.mt, marginLeft: 'auto' }}>IA integrada com dados da agência</span>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {chatMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: T.mt }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
              <div style={{ fontSize: 14, marginBottom: 14 }}>Olá! Sou a Alice, sua assistente IA.</div>
              <div style={{ fontSize: 13, color: T.mt2, marginBottom: 16 }}>Posso consultar dados dos seus clientes, métricas, tarefas e muito mais.</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                {['Como está a agência hoje?', 'Quais clientes têm alertas?', 'Resumo das tarefas atrasadas', 'Qual cliente gera mais receita?'].map(q => (
                  <button key={q} onClick={() => { setChatInput(q); }} style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, padding: '8px 14px', color: '#c4b5fd', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '12px 16px', borderRadius: 12,
                background: m.role === 'user' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (m.role === 'user' ? 'rgba(99,102,241,0.25)' : T.bdr),
                fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const,
              }}>
                {m.role === 'assistant' && <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700, display: 'block', marginBottom: 4 }}>🤖 Alice</span>}
                {m.content}
              </div>
            </div>
          ))}
          {chatLoading && <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: T.mt, fontSize: 13 }}><span style={{ fontSize: 16 }}>🤖</span> Alice está pensando...</div>}
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }} placeholder="Pergunte sobre seus clientes, métricas, tarefas..." style={{ ...inputS, flex: 1, fontSize: 14 }} />
          <button onClick={sendChat} disabled={!chatInput.trim() || chatLoading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: chatInput.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: chatInput.trim() ? '#fff' : T.mt, cursor: chatInput.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Enviar</button>
        </div>
      </div>
    </main></div>);
  }

  // ═══ PROSPECTS ═══
  if (page === 'prospects') return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}><Prospects user={user} /></main></div>);

  // ═══ ESTRATÉGIAS ═══
  if (page === 'estrategias') return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}><BancoEstrategias user={user} /></main></div>);

  // ═══ CRM PAGE — Pipeline Kanban ═══
  if (page === 'crm') {
    const formClients = clients.filter(c => c.phase === 'Onboarding' && c.status === 'ativo');
    const onboardingClients = clients.filter(c => c.phase !== 'Onboarding' && c.phase !== 'Manutenção' && c.phase !== 'Growth' && c.phase !== 'Escala' && c.phase !== 'Debriefing' && c.phase !== 'Pós-Lançamento' && c.status === 'ativo');
    const activeClients = clients.filter(c => ['Manutenção', 'Growth', 'Escala', 'Debriefing', 'Pós-Lançamento', 'Otimização', 'Captação', 'Lançamento', 'Aquecimento', 'Geração Leads'].includes(c.phase) && c.status === 'ativo');

    const columns = [
      { key: 'form', label: '📋 Formulário Enviado', color: '#8b5cf6', clients: formClients, desc: 'Cliente preencheu o formulário, aguardando setup' },
      { key: 'onboarding', label: '🚀 Onboarding', color: '#f59e0b', clients: onboardingClients, desc: 'Setup técnico em andamento' },
      { key: 'active', label: '✅ Contrato Ativo', color: '#22c55e', clients: activeClients, desc: 'Operando normalmente' },
    ];

    return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🏢 CRM — Pipeline de Clientes</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ fontSize: 13, color: T.mt, display: 'flex', gap: 14, alignItems: 'center' }}>
            <span><b style={{ color: '#8b5cf6' }}>{formClients.length}</b> formulário</span>
            <span><b style={{ color: '#f59e0b' }}>{onboardingClients.length}</b> onboarding</span>
            <span><b style={{ color: '#22c55e' }}>{activeClients.length}</b> ativos</span>
          </div>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {columns.map(col => (
          <div key={col.key} style={{ flex: 1, background: 'rgba(255,255,255,0.015)', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 16, minHeight: 400 }}>
            {/* Column header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>{col.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, background: col.color + '15', color: col.color, padding: '2px 8px', borderRadius: 5, marginLeft: 'auto' }}>{col.clients.length}</span>
            </div>
            <div style={{ fontSize: 11, color: T.mt, marginBottom: 14 }}>{col.desc}</div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.clients.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: T.mt2, fontSize: 13 }}>
                  Nenhum cliente
                </div>
              )}
              {col.clients.map(c => {
                const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
                return (
                  <div key={c.id} onClick={() => { setSel(c); setPage('onboarding_detail'); setEditingCrm(false); loadClientMetrics(c.id); loadFormData(c.id); }} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: sq.color, opacity: 0.4 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: sq.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                        <div style={{ fontSize: 11, color: T.mt }}>{c.niche || sq.label}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sq.color + '15', color: sq.color }}>{sq.icon} {sq.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{c.phase}</span>
                      {c.fee > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: '#22c55e15', color: '#22c55e' }}>{fB(c.fee)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main></div>);
  }

  // ═══ ONBOARDING DETAIL ═══
  if (page === 'onboarding_detail' && sel) {
    const c = sel;
    const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };

    return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setPage('crm'); setSel(null); }} style={btnS('#a78bfa')}>← CRM Pipeline</button>
        <button onClick={() => openC(c)} style={btnS('#3b82f6')}>📋 Ver como Cliente Ativo</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: sq.color + '20', border: '2px solid ' + sq.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{c.name}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: sq.color + '20', color: sq.color }}>{sq.icon} {sq.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>🚀 {c.phase}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {/* LEFT: Form + CRM Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Form link */}
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.03))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Formulário de Cadastro</h3>
              {formData?.status === 'preenchido' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅ Preenchido</span>}
              {formData && formData.status !== 'preenchido' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>⏳ Aguardando</span>}
            </div>
            {!formLink ? (
              <button onClick={() => generateFormLink(c.id)} style={{ ...btnS('#6366f1'), fontSize: 14, padding: '12px 20px' }}>🔗 Gerar Link do Formulário</button>
            ) : (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={formLink} readOnly style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '10px 14px', color: '#a5b4fc', fontSize: 12, fontFamily: T.mo, outline: 'none' }} />
                <button onClick={() => { navigator.clipboard.writeText(formLink); setFormCopied(true); setTimeout(() => setFormCopied(false), 2000); }} style={btnS(formCopied ? '#22c55e' : '#6366f1', { fontSize: 12, padding: '10px 14px' })}>{formCopied ? '✅' : '📋'}</button>
                <a href={formLink} target="_blank" rel="noopener noreferrer" style={{ ...btnS('#22c55e'), fontSize: 12, padding: '10px 14px', textDecoration: 'none', display: 'inline-block' }}>👁️</a>
              </div>
            )}
          </div>

          {/* Form data if submitted */}
          {formData?.status === 'preenchido' && (
            <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 14, padding: '18px 22px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: '#22c55e' }}>📬 Dados Recebidos</h3>
              {[['nome_socio', 'Nome Sócio'], ['nome_empresa', 'Empresa'], ['email', 'Email'], ['whatsapp', 'WhatsApp'], ['cnpj', 'CNPJ'], ['cpf_socio', 'CPF'], ['rg', 'RG'], ['endereco_cep', 'Endereço'], ['profissao', 'Profissão'], ['estado_civil', 'Estado Civil'], ['site_instagram', 'Site/Instagram'], ['dia_pagamento', 'Dia Pagamento'], ['produto_servico', 'Produto/Serviço'], ['publico_alvo', 'Público-alvo'], ['objetivos', 'Objetivos'], ['concorrentes', 'Concorrentes'], ['historico', 'Histórico']].map(([k, l]) => formData[k] ? (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(34,197,94,0.08)', fontSize: 13 }}>
                  <span style={{ color: T.mt }}>{l}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' as const, maxWidth: '60%' }}>{formData[k]}</span>
                </div>
              ) : null)}
            </div>
          )}
        </div>

        {/* RIGHT: Onboarding Checklist */}
        <div>
          {(() => {
            const done = ONBOARDING_ITEMS.filter(item => onboardingData[item.key]);
            const pct = Math.round((done.length / ONBOARDING_ITEMS.length) * 100);
            return (
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🚀 Checklist de Onboarding</h3>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444' }}>{pct}%</span>
                </div>
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 18, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.5s ease' }} />
                </div>
                {['Admin', 'Comunicação', 'Acessos', 'Técnico', 'Produção'].map(cat => {
                  const items = ONBOARDING_ITEMS.filter(i => i.cat === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.mt2, textTransform: 'uppercase' as const, marginBottom: 6 }}>{cat}</div>
                      {items.map(item => {
                        const checked = !!onboardingData[item.key];
                        return (
                          <div key={item.key} onClick={() => toggleOnboarding(c.id, item.key, !checked)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: checked ? 'rgba(34,197,94,0.04)' : 'transparent', border: '1px solid ' + (checked ? 'rgba(34,197,94,0.15)' : T.bdr), borderRadius: 9, cursor: 'pointer', marginBottom: 5 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, border: '2px solid ' + (checked ? '#22c55e' : 'rgba(255,255,255,0.15)'), background: checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>{checked ? '✓' : ''}</div>
                            <span style={{ fontSize: 14 }}>{item.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: checked ? T.mt : T.tx, textDecoration: checked ? 'line-through' : 'none' }}>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {pct === 100 && <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 15, color: '#22c55e', fontWeight: 700 }}>🎉 Onboarding completo!</div>}
              </div>
            );
          })()}
        </div>
      </div>
    </main></div>);
  }

  // ═══ DASHBOARDS ═══
  if (page === 'dashboards') return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}><DashboardManager clients={clients} user={user} T={T} /></main></div>);


  // ═══ AGENDA ═══
  if (page === 'agenda') {
    const grouped: Record<string, any[]> = {};
    [...meetings].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).forEach(m => {
      const d = new Date(m.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' });
      if (!grouped[d]) grouped[d] = []; grouped[d].push(m);
    });
    return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📅 Agenda</h1><button onClick={() => setShowNewMeeting(true)} style={btnS('#3b82f6')}>+ Reunião</button></div>
      {Object.entries(grouped).map(([day, evs]) => (<div key={day} style={{ marginBottom: 20 }}><div style={{ fontSize: 15, fontWeight: 700, color: '#a5b4fc', marginBottom: 8, textTransform: 'capitalize' as const }}>{day}</div>
        {evs.map((m: any) => { const cl = clients.find(c => c.id === m.client_id); return (<div key={m.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ fontSize: 14, fontFamily: T.mo, color: '#a5b4fc', fontWeight: 600, minWidth: 55 }}>{m.time?.slice(0, 5)}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{m.title}</div>{cl && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: ((SQUADS as any)[cl.squad]?.color || '#a78bfa') + '15', color: (SQUADS as any)[cl.squad]?.color }}>{cl.name}</span>}</div>
          {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#22c55e', textDecoration: 'none', fontWeight: 600 }}>📹 Entrar</a>}
          <button onClick={() => deleteMeeting(m.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>); })}</div>))}
      {meetings.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.mt, fontSize: 15 }}>Nenhuma reunião</div>}
    </main></div>);
  }

  // ═══ TASKS ═══
  if (page === 'tasks') return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>✅ Tarefas</h1><button onClick={() => setShowNewTask(true)} style={btnS('#22c55e')}>+ Tarefa</button></div>
    <div style={{ display: 'flex', gap: 14 }}>{TASK_COLS.map(col => (
      <div key={col.key} onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(99,102,241,0.04)'; }} onDragLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }} onDrop={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; if (dragTask) { updateTask(dragTask, { status: col.key }); setDragTask(null); } }}
        style={{ flex: 1, background: 'rgba(255,255,255,0.015)', border: '1px solid ' + T.bdr, borderRadius: 14, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} /><span style={{ fontSize: 15, fontWeight: 700 }}>{col.label}</span><span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: 5, color: T.mt, marginLeft: 'auto' }}>{tasks.filter(t => t.status === col.key).length}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>{tasks.filter(t => t.status === col.key).map(t => {
          const cl = clients.find(c => c.id === t.client_id); const pr = (PRIO as any)[t.priority] || PRIO.normal; const od = t.due_date && t.due_date < todayStr && t.status !== 'feito';
          return (<div key={t.id} draggable onDragStart={() => setDragTask(t.id)} onDragEnd={() => setDragTask(null)} style={{ background: T.card, border: '1px solid ' + (od ? 'rgba(239,68,68,0.25)' : T.bdr), borderRadius: 10, padding: '12px 14px', cursor: 'grab' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</span><button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 12 }}>✕</button></div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {cl && <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: ((SQUADS as any)[cl.squad]?.color || '#a78bfa') + '15', color: (SQUADS as any)[cl.squad]?.color }}>{cl.name}</span>}
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 5, background: pr.bg, color: pr.color }}>{t.priority}</span>
              {t.due_date && <span style={{ fontSize: 11, color: od ? '#ef4444' : T.mt, fontFamily: T.mo }}>{new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
            </div></div>);
        })}</div></div>))}</div>
  </main></div>);

  // ═══ FINANCEIRO ═══
  if (page === 'financeiro') return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}><Financeiro clients={clients} user={user} /></main></div>);

  // ═══ CLIENT DETAIL ═══
  if (page === 'client' && sel) {
    const c = clients.find(x => x.id === sel.id) || sel;
    const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
    const links = [{ l: 'Meta Ads', u: c.meta_url, i: '📘', cl: '#3b82f6' }, { l: 'Google Ads', u: c.google_url, i: '🔍', cl: '#f59e0b' }, { l: 'Analytics', u: c.analytics_url, i: '📊', cl: '#22c55e' }, { l: 'Hotmart', u: c.hotmart_url, i: '🔥', cl: '#ef4444' }, { l: 'WhatsApp', u: c.whatsapp_group, i: '💬', cl: '#25D366' }].filter(x => x.u);
    const clientTasks = tasks.filter(t => t.client_id === c.id);
    const funnelTpl = (FUNNEL_TPL as any)[c.squad] || [];
    const kpiTpl = (KPI_TPL as any)[c.squad] || [];
    const phases = (PHASES as any)[c.squad] || [];

    return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}<main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={goHome} style={btnS('#a78bfa')}>← Hub</button>
        <button onClick={() => genReport(c)} style={btnS('#25D366')}>{copied ? '✅ Copiado!' : '📋 Relatório WPP'}</button>
        <button onClick={() => { if (confirm('Excluir ' + c.name + '?')) deleteClient(c.id); }} style={btnS('#ef4444', { marginLeft: 'auto' })}>🗑️ Excluir</button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <div style={{ width: 54, height: 54, borderRadius: 16, background: sq.color + '20', border: '2px solid ' + sq.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
        <div><h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{c.name}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: sq.color + '20', color: sq.color }}>{sq.icon} {sq.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{c.phase}</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: '#22c55e20', color: '#22c55e' }}>{fB(c.fee)}/mês</span>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: c.status === 'ativo' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: c.status === 'ativo' ? '#22c55e' : '#ef4444' }}>{c.status}</span>
          </div></div>
      </div>

      {/* Metrics strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
        {[{ l: 'Invest.', v: fB(metricsData.spend || 0), cl: '#ef4444' }, { l: 'Receita', v: fB(metricsData.revenue || 0), cl: '#22c55e' }, { l: 'Leads', v: fN(metricsData.leads || 0), cl: '#3b82f6' }, { l: 'ROAS', v: (Number(metricsData.roas) || 0).toFixed(2) + 'x', cl: '#f59e0b' }].map(m => (
          <div key={m.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: m.cl, opacity: 0.5 }} />
            <div style={{ fontSize: 11, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{m.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mo, marginTop: 4, color: m.cl }}>{m.v}</div>
          </div>))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid ' + T.bdr }}>
        {[{ id: 'log', l: '📝 Activity Log' }, { id: 'acoes', l: '🚀 Próximas Ações' }, { id: 'info', l: '📋 Info' }, { id: 'metricas', l: '📊 Funil & Métricas' }, { id: 'tarefas', l: '✅ Tarefas' }, { id: 'notas', l: '📝 Notas' }].map(t => (
          <button key={t.id} onClick={() => setClientTab(t.id)} style={{ background: clientTab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', padding: '9px 16px', cursor: 'pointer', borderBottom: clientTab === t.id ? '2px solid ' + sq.color : '2px solid transparent', color: clientTab === t.id ? T.tx : T.mt, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' as const }}>{t.l}</button>
        ))}
      </div>

      {/* ═══ CRM & ONBOARDING TAB ═══ */}
      {clientTab === 'crm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Form Link Section */}
          <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(139,92,246,0.03))', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>📋 Formulário de Cadastro</h3>
              {formData?.status === 'preenchido' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>✅ Preenchido</span>}
              {formData && formData.status !== 'preenchido' && <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>⏳ Aguardando</span>}
            </div>
            <p style={{ fontSize: 13, color: T.mt, marginBottom: 14 }}>Gere um link para o cliente preencher os dados cadastrais. Quando ele enviar, os dados aparecem aqui automaticamente.</p>
            
            {!formLink ? (
              <button onClick={() => generateFormLink(c.id)} style={{ ...btnS('#6366f1'), fontSize: 14, padding: '12px 20px' }}>🔗 Gerar Link do Formulário</button>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                  <input value={formLink} readOnly style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '10px 14px', color: '#a5b4fc', fontSize: 13, fontFamily: T.mo, outline: 'none' }} />
                  <button onClick={() => { navigator.clipboard.writeText(formLink); setFormCopied(true); setTimeout(() => setFormCopied(false), 2000); }} style={btnS(formCopied ? '#22c55e' : '#6366f1', { fontSize: 13, padding: '10px 16px' })}>{formCopied ? '✅ Copiado!' : '📋 Copiar'}</button>
                  <a href={formLink} target="_blank" rel="noopener noreferrer" style={{ ...btnS('#22c55e'), fontSize: 13, padding: '10px 16px', textDecoration: 'none', display: 'inline-block' }}>👁️ Ver</a>
                </div>
                {formData?.status === 'preenchido' && (
                  <button onClick={() => loadFormData(c.id)} style={btnS('#3b82f6', { fontSize: 12, padding: '8px 14px' })}>🔄 Atualizar dados do formulário</button>
                )}
              </div>
            )}
          </div>

          {/* Form data preview if submitted */}
          {formData?.status === 'preenchido' && (
            <div style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 14, padding: '18px 22px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px', color: '#22c55e' }}>📬 Dados Recebidos do Cliente</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { k: 'nome_socio', l: 'Nome Sócio', icon: '👤' },
                  { k: 'nome_empresa', l: 'Empresa', icon: '🏢' },
                  { k: 'email', l: 'Email', icon: '📧' },
                  { k: 'whatsapp', l: 'WhatsApp', icon: '💬' },
                  { k: 'cnpj', l: 'CNPJ', icon: '📄' },
                  { k: 'cpf_socio', l: 'CPF', icon: '🪪' },
                  { k: 'rg', l: 'RG', icon: '🪪' },
                  { k: 'endereco_cep', l: 'Endereço', icon: '📍' },
                  { k: 'profissao', l: 'Profissão', icon: '💼' },
                  { k: 'estado_civil', l: 'Estado Civil', icon: '💍' },
                  { k: 'site_instagram', l: 'Site/Instagram', icon: '📱' },
                  { k: 'dia_pagamento', l: 'Dia Pagamento', icon: '📅' },
                  { k: 'produto_servico', l: 'Produto/Serviço', icon: '🎯' },
                  { k: 'publico_alvo', l: 'Público-alvo', icon: '👥' },
                  { k: 'orcamento_trafego', l: 'Orçamento Tráfego', icon: '💵' },
                  { k: 'objetivos', l: 'Objetivos', icon: '🎯' },
                  { k: 'concorrentes', l: 'Concorrentes', icon: '⚔️' },
                  { k: 'historico', l: 'Histórico', icon: '📖' },
                  { k: 'dados_bancarios', l: 'Dados Bancários', icon: '🏦' },
                  { k: 'tipo_cobranca', l: 'Tipo Cobrança', icon: '📋' },
                  { k: 'observacoes', l: 'Observações', icon: '📝' },
                ].map(f => formData[f.k] ? (
                  <div key={f.k} style={{ padding: '8px 0', borderBottom: '1px solid rgba(34,197,94,0.08)' }}>
                    <div style={{ fontSize: 11, color: T.mt }}>{f.icon} {f.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{formData[f.k]}</div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}
          {/* Onboarding Progress */}
          {(() => {
            const done = ONBOARDING_ITEMS.filter(item => onboardingData[item.key]);
            const pct = Math.round((done.length / ONBOARDING_ITEMS.length) * 100);
            return (
              <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🚀 Onboarding — Checklist</h3>
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#ef4444' }}>{pct}% ({done.length}/{ONBOARDING_ITEMS.length})</span>
                </div>
                {/* Progress bar */}
                <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 18, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.5s ease' }} />
                </div>
                {/* Items by category */}
                {['Admin', 'Comunicação', 'Acessos', 'Técnico', 'Produção'].map(cat => {
                  const items = ONBOARDING_ITEMS.filter(i => i.cat === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.mt2, textTransform: 'uppercase' as const, marginBottom: 8 }}>{cat}</div>
                      {items.map(item => {
                        const checked = !!onboardingData[item.key];
                        return (
                          <div key={item.key} onClick={() => toggleOnboarding(c.id, item.key, !checked)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: checked ? 'rgba(34,197,94,0.04)' : 'rgba(255,255,255,0.01)', border: '1px solid ' + (checked ? 'rgba(34,197,94,0.15)' : T.bdr), borderRadius: 10, cursor: 'pointer', marginBottom: 6, transition: 'all 0.2s' }}>
                            <div style={{ width: 24, height: 24, borderRadius: 7, border: '2px solid ' + (checked ? '#22c55e' : 'rgba(255,255,255,0.15)'), background: checked ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, transition: 'all 0.2s' }}>{checked ? '✓' : ''}</div>
                            <span style={{ fontSize: 15 }}>{item.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: checked ? T.mt : T.tx, textDecoration: checked ? 'line-through' : 'none', flex: 1 }}>{item.label}</span>
                            {checked && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>Concluído</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {pct === 100 && <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 15, color: '#22c55e', fontWeight: 700 }}>🎉 Onboarding completo! Cliente pronto para operar.</div>}
              </div>
            );
          })()}

          {/* CRM Data */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🏢 Dados do Cliente (CRM)</h3>
              {!editingCrm ? <button onClick={() => setEditingCrm(true)} style={btnS('#3b82f6', { fontSize: 12, padding: '7px 14px' })}>✏️ Editar</button>
                : <div style={{ display: 'flex', gap: 6 }}><button onClick={() => saveCrmData(c.id)} style={btnS('#22c55e', { fontSize: 12, padding: '7px 14px' })}>💾 Salvar</button><button onClick={() => { setEditingCrm(false); loadClientMetrics(c.id); }} style={btnS('#ef4444', { fontSize: 12, padding: '7px 14px' })}>Cancelar</button></div>}
            </div>

            {editingCrm ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { k: 'endereco', l: 'Endereço', full: true },
                  { k: 'instagram_site', l: 'Instagram / Site' },
                  { k: 'produto_servico', l: 'Produto / Serviço' },
                  { k: 'publico_alvo', l: 'Público-alvo', full: true },
                  { k: 'orcamento_trafego', l: 'Orçamento mensal de tráfego (R$)', t: 'number' },
                  { k: 'fee_acordado', l: 'Fee acordado (R$)', t: 'number' },
                  { k: 'tipo_cobranca', l: 'Tipo de cobrança (fixo, %, mix)' },
                  { k: 'dados_bancarios', l: 'Dados bancários / PIX' },
                  { k: 'objetivos', l: 'Objetivos (leads, vendas, seguidores)', full: true },
                  { k: 'concorrentes', l: 'Concorrentes', full: true },
                  { k: 'historico', l: 'Histórico (já anunciou antes?)', full: true },
                ].map(f => (
                  <div key={f.k} style={{ gridColumn: (f as any).full ? '1 / -1' : undefined }}>
                    <label style={labelS}>{f.l}</label>
                    {(f as any).full ? (
                      <textarea value={crmData[f.k] || ''} onChange={e => setCrmData({ ...crmData, [f.k]: e.target.value })} rows={2} style={{ ...inputS, resize: 'vertical' as const }} />
                    ) : (
                      <input type={f.t || 'text'} value={crmData[f.k] || ''} onChange={e => setCrmData({ ...crmData, [f.k]: e.target.value })} style={inputS} />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { k: 'endereco', l: 'Endereço', icon: '📍' },
                  { k: 'instagram_site', l: 'Instagram / Site', icon: '📱' },
                  { k: 'produto_servico', l: 'Produto / Serviço', icon: '🎯' },
                  { k: 'publico_alvo', l: 'Público-alvo', icon: '👥' },
                  { k: 'orcamento_trafego', l: 'Orçamento Tráfego', icon: '💵', prefix: 'R$ ' },
                  { k: 'fee_acordado', l: 'Fee Acordado', icon: '💰', prefix: 'R$ ' },
                  { k: 'tipo_cobranca', l: 'Tipo de Cobrança', icon: '📋' },
                  { k: 'dados_bancarios', l: 'Dados Bancários / PIX', icon: '🏦' },
                  { k: 'objetivos', l: 'Objetivos', icon: '🎯' },
                  { k: 'concorrentes', l: 'Concorrentes', icon: '⚔️' },
                  { k: 'historico', l: 'Histórico', icon: '📖' },
                ].map(f => {
                  const val = crmData[f.k];
                  return (
                    <div key={f.k} style={{ padding: '10px 0', borderBottom: '1px solid ' + T.bdr }}>
                      <div style={{ fontSize: 11, color: T.mt, marginBottom: 3 }}>{(f as any).icon} {f.l}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: val ? T.tx : T.mt2 }}>
                        {val ? ((f as any).prefix || '') + val : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!editingCrm && Object.values(crmData).every(v => !v) && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: T.mt }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏢</div>
                <p style={{ fontSize: 14, marginBottom: 12 }}>Nenhum dado CRM preenchido ainda</p>
                <button onClick={() => setEditingCrm(true)} style={btnS('#3b82f6')}>Preencher dados do cliente</button>
              </div>
            )}
          </div>
        </div>
      )}
{/* ═══ PRÓXIMAS AÇÕES TAB ═══ */}
      {clientTab === 'acoes' && (
        <ProximasAcoes client={c} user={user} />
      )}
      {/* ═══ ACTIVITY LOG TAB ═══ */}
      {clientTab === 'log' && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>📝 Activity Log — {c.name}</h3>

          {/* Add new entry */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20, marginBottom: 18 }}>
            <div style={{ marginBottom: 10 }}>
              <label style={labelS}>O que foi feito?</label>
              <textarea value={newLog.action} onChange={e => setNewLog({ ...newLog, action: e.target.value })} placeholder="Ex: Otimizei campanha de captação, ajustei público LAL 1%..." rows={2} style={{ ...inputS, resize: 'vertical' as const }} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={labelS}>Categoria</label>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    ['otimizacao', '⚡ Otimização', '#f59e0b'],
                    ['campanha', '📢 Campanha', '#3b82f6'],
                    ['criativo', '🎨 Criativo', '#8b5cf6'],
                    ['reuniao', '🤝 Reunião', '#22c55e'],
                    ['estrategia', '🎯 Estratégia', '#ef4444'],
                    ['outro', '📋 Outro', '#64748b'],
                  ].map(([k, l, cl]) => (
                    <button key={k} onClick={() => setNewLog({ ...newLog, category: k })} style={{ padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: newLog.category === k ? cl + '20' : 'rgba(255,255,255,0.03)', border: newLog.category === k ? '1px solid ' + cl + '40' : '1px solid ' + T.bdr, color: newLog.category === k ? cl : T.mt }}>{l}</button>
                  ))}
                </div>
              </div>
              <button onClick={() => addLogEntry(c.id)} disabled={!newLog.action.trim()} style={{ ...btnS('#22c55e'), opacity: newLog.action.trim() ? 1 : 0.4 }}>+ Registrar</button>
            </div>
          </div>

          {/* Log entries */}
          {logEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: T.mt }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📝</div>
              <p style={{ fontSize: 15 }}>Nenhuma ação registrada ainda</p>
              <p style={{ fontSize: 13, color: T.mt2 }}>Registre otimizações, mudanças de campanha, reuniões e decisões aqui.</p>
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Timeline line */}
              <div style={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.06)' }} />

              {logEntries.map((entry, i) => {
                const parts = entry.text.replace('LOG:', '').split(':');
                const category = parts[0] || 'outro';
                const action = parts.slice(1).join(':');
                const catInfo: any = {
                  otimizacao: { label: 'Otimização', color: '#f59e0b', icon: '⚡' },
                  campanha: { label: 'Campanha', color: '#3b82f6', icon: '📢' },
                  criativo: { label: 'Criativo', color: '#8b5cf6', icon: '🎨' },
                  reuniao: { label: 'Reunião', color: '#22c55e', icon: '🤝' },
                  estrategia: { label: 'Estratégia', color: '#ef4444', icon: '🎯' },
                  outro: { label: 'Outro', color: '#64748b', icon: '📋' },
                }[category] || { label: 'Outro', color: '#64748b', icon: '📋' };
                const date = new Date(entry.created_at);
                const isToday = date.toISOString().split('T')[0] === todayStr;
                const isYesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] === date.toISOString().split('T')[0];

                return (
                  <div key={entry.id} style={{ display: 'flex', gap: 14, marginBottom: 14, position: 'relative' }}>
                    {/* Timeline dot */}
                    <div style={{ position: 'absolute', left: -18, top: 6, width: 12, height: 12, borderRadius: '50%', background: catInfo.color, border: '2px solid #08080f', zIndex: 1 }} />

                    <div style={{ flex: 1, background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: catInfo.color + '15', color: catInfo.color }}>{catInfo.icon} {catInfo.label}</span>
                          <span style={{ fontSize: 12, color: T.mt, fontFamily: T.mo }}>
                            {isToday ? 'Hoje' : isYesterday ? 'Ontem' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button onClick={() => deleteLogEntry(entry.id, c.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 12 }}>✕</button>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{action}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ INFO TAB — with edit ═══ */}
      {clientTab === 'info' && !editingClient && (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => { setEditClient(c); setEditingClient(true); }} style={btnS('#3b82f6')}>✏️ Editar Cliente</button>
            <button onClick={() => setShowNewAlert(true)} style={btnS('#ef4444')}>🚨 Adicionar Alerta</button>
          </div>
          {/* Active Alerts */}
          {(() => { const alerts = (c.client_alerts || []).filter((a: any) => !a.resolved); return alerts.length > 0 ? (
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fca5a5', marginBottom: 8 }}>🚨 Alertas Ativos</div>
              {alerts.map((a: any) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                  <span style={{ fontSize: 14 }}>{a.type === 'error' ? '🔴' : a.type === 'warning' ? '🟡' : '🔵'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: T.mt }}>{new Date(a.created_at).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <button onClick={() => resolveAlert(a.id, c.id)} style={btnS('#22c55e', { fontSize: 11, padding: '5px 12px' })}>✅ Resolver</button>
                </div>
              ))}
            </div>
          ) : null; })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Dados</h3>
              {[['Contato', c.contact_name], ['Telefone', c.contact_phone], ['Nicho', c.niche], ['Produto', c.product], ['Fee', c.fee ? fB(c.fee) + '/mês' : '—'], ['Squad', (SQUADS as any)[c.squad]?.label], ['Fase', c.phase], ['Status', c.status]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + T.bdr }}>
                  <span style={{ fontSize: 13, color: T.mt }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{v || '—'}</span>
                </div>))}
            </div>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Acessos</h3>
              {links.map(l => (<a key={l.l} href={l.u} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: l.cl + '10', border: '1px solid ' + l.cl + '25', borderRadius: 10, textDecoration: 'none', color: T.tx, marginBottom: 8 }}><span style={{ fontSize: 16 }}>{l.i}</span><span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{l.l}</span><span style={{ fontSize: 13, color: l.cl }}>→</span></a>))}
              {!links.length && <p style={{ color: T.mt, fontSize: 14 }}>Nenhum link cadastrado — edite o cliente para adicionar</p>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ INFO TAB — editing mode ═══ */}
      {clientTab === 'info' && editingClient && (
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 24, maxWidth: 600 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 16px' }}>✏️ Editar Cliente</h3>
          {clientFields.map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <label style={labelS}>{f.l}</label>
              <input type={f.t || 'text'} value={editClient[f.k] || ''} onChange={e => setEditClient({ ...editClient, [f.k]: e.target.value })} style={inputS} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={labelS}>Squad</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(SQUADS).map(([k, v]) => (
                <button key={k} onClick={() => setEditClient({ ...editClient, squad: k })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: editClient.squad === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: editClient.squad === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: editClient.squad === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelS}>Fase</label>
            <select value={editClient.phase || ''} onChange={e => setEditClient({ ...editClient, phase: e.target.value })} style={inputS}>
              {phases.map((p: string) => <option key={p} value={p} style={{ background: '#1a1a2e' }}>{p}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelS}>Status</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ativo', 'pausado'].map(s => (
                <button key={s} onClick={() => setEditClient({ ...editClient, status: s })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: editClient.status === s ? (s === 'ativo' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : 'rgba(255,255,255,0.03)', border: '1px solid ' + (editClient.status === s ? (s === 'ativo' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)') : T.bdr), color: editClient.status === s ? (s === 'ativo' ? '#22c55e' : '#ef4444') : T.mt, textTransform: 'capitalize' as const }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setEditingClient(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={saveClient} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>💾 Salvar</button>
          </div>
        </div>
      )}

      {/* ═══ METRICS TAB ═══ */}
      {clientTab === 'metricas' && (<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {!editingMetrics ? <button onClick={() => setEditingMetrics(true)} style={btnS('#3b82f6')}>✏️ Editar Métricas</button> : <>
            <button onClick={() => saveClientMetrics(c.id)} style={btnS('#22c55e')}>💾 Salvar</button>
            <button onClick={() => { setEditingMetrics(false); loadClientMetrics(c.id); }} style={btnS('#ef4444')}>Cancelar</button></>}
        </div>
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Funil — {sq.label}</h3>
          <p style={{ fontSize: 13, color: T.mt, margin: '0 0 18px' }}>{c.squad === 'lancamentos' ? 'Impressão → Inscrição → Presença → Venda' : c.squad === 'perpetuo' ? 'Sessão → Produto → Carrinho → Compra' : 'Impressão → Lead → Agendamento → Fechamento'}</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            {funnelTpl.map((f: any, i: number) => {
              const val = Number(funnelData[f.key]) || 0;
              const prevVal = i > 0 ? (Number(funnelData[funnelTpl[i - 1].key]) || 0) : val;
              const pct = i > 0 && prevVal > 0 ? (val / prevVal * 100) : 100;
              const w = 90 - (55 * i) / (funnelTpl.length - 1);
              return (<div key={f.key} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: w + '%', minWidth: 200, background: 'linear-gradient(135deg,' + f.color + 'bb,' + f.color + '44)', border: '1px solid ' + f.color + '33', borderRadius: 10, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{f.label}</span>
                  {editingMetrics ? <input type="number" value={funnelData[f.key] ?? ''} onChange={e => setFunnelData({ ...funnelData, [f.key]: e.target.value })} style={{ width: 110, textAlign: 'right' as const, fontSize: 16, fontFamily: T.mo, background: 'rgba(0,0,0,0.3)', border: '1px solid ' + T.bdr, borderRadius: 8, padding: '5px 10px', color: T.tx, outline: 'none' }} />
                    : <span style={{ fontSize: 18, fontWeight: 800, fontFamily: T.mo }}>{fN(val)}</span>}
                </div>
                {i > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: pct > 20 ? '#22c55e' : pct > 5 ? '#f59e0b' : '#ef4444', background: 'rgba(255,255,255,0.03)', padding: '2px 9px', borderRadius: 5 }}>{pct.toFixed(1)}%</span>}
              </div>);
            })}
          </div>
        </div>
        {funnelTpl.length > 1 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + (funnelTpl.length - 1) + ',1fr)', gap: 10 }}>
          {funnelTpl.slice(1).map((f: any, i: number) => { const prev = funnelTpl[i]; const val = Number(funnelData[f.key]) || 0; const prevVal = Number(funnelData[prev.key]) || 0; const pct = prevVal > 0 ? (val / prevVal * 100) : 0;
            return (<div key={f.key} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '14px 10px', textAlign: 'center' as const }}><div style={{ fontSize: 24, fontWeight: 700, fontFamily: T.mo, color: pct > 20 ? '#22c55e' : pct > 5 ? '#f59e0b' : '#3b82f6' }}>{pct.toFixed(1)}%</div><div style={{ fontSize: 10, color: T.mt, marginTop: 4 }}>{prev.label} → {f.label}</div></div>);
          })}</div>}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>KPIs — {sq.label}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>{kpiTpl.map((k: any) => { const val = Number(kpiData[k.key]) || 0; return (
            <div key={k.key} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '12px 14px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.4 }} />
              <div style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{k.label}</div>
              {editingMetrics ? <input type="number" value={kpiData[k.key] ?? ''} onChange={e => setKpiData({ ...kpiData, [k.key]: e.target.value })} style={{ ...inputS, fontSize: 16, fontFamily: T.mo, marginTop: 4, padding: '6px 10px' }} />
                : <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mo, marginTop: 4, color: k.color }}>{k.prefix || ''}{val.toLocaleString('pt-BR')}{k.suffix || ''}</div>}
            </div>); })}</div>
        </div>
        {Object.keys(funnelData).length === 0 && !editingMetrics && <div style={{ textAlign: 'center' as const, padding: 30, color: T.mt }}><div style={{ fontSize: 32, marginBottom: 10 }}>📊</div><p style={{ fontSize: 15, marginBottom: 14 }}>Nenhuma métrica para este mês</p><button onClick={() => setEditingMetrics(true)} style={btnS('#6366f1')}>Começar a preencher</button></div>}
      </div>)}

      {/* ═══ TASKS TAB ═══ */}
      {clientTab === 'tarefas' && (<div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}><h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Tarefas</h3><button onClick={() => { setNt({ title: '', client_id: c.id, priority: 'normal', due_date: '' }); setShowNewTask(true); }} style={btnS('#22c55e', { fontSize: 13, padding: '8px 14px' })}>+ Tarefa</button></div>
        {clientTasks.length === 0 ? <p style={{ color: T.mt, fontSize: 14 }}>Nenhuma tarefa</p> : clientTasks.map(t => { const pr = (PRIO as any)[t.priority]; const col = TASK_COLS.find(x => x.key === t.status);
          return (<div key={t.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}><div style={{ width: 10, height: 10, borderRadius: '50%', background: col?.color }} /><span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{t.title}</span><span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: pr?.bg, color: pr?.color }}>{t.priority}</span>
            <select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value })} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid ' + T.bdr, borderRadius: 7, padding: '4px 8px', color: T.tx, fontSize: 12, outline: 'none' }}>{TASK_COLS.map(c => <option key={c.key} value={c.key} style={{ background: '#1a1a2e' }}>{c.label}</option>)}</select></div>); })}
      </div>)}

      {/* ═══ NOTES TAB ═══ */}
      {clientTab === 'notas' && (<div>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>📝 Notas & Atas</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Ata de reunião, decisão, observação..." rows={3} style={{ ...inputS, resize: 'vertical' as const, flex: 1 }} />
          <button onClick={() => addNote(c.id)} disabled={!noteText.trim()} style={{ ...btnS('#22c55e'), alignSelf: 'flex-end', opacity: noteText.trim() ? 1 : 0.4 }}>Salvar</button>
        </div>
        {clientNotes.length === 0 ? <p style={{ color: T.mt, fontSize: 14 }}>Nenhuma nota</p> : clientNotes.map((n: any) => (
          <div key={n.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: '#a5b4fc', fontWeight: 700, marginBottom: 6, fontFamily: T.mo }}>{new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{n.text}</div>
            <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 12, marginTop: 6 }}>🗑️ Excluir</button>
          </div>))}
      </div>)}
    </main>
    
    {/* Alert Modal for Client */}
    {showNewAlert && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewAlert(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>🚨 Novo Alerta — {c.name}</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={labelS}>Tipo</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['error', '🔴 Crítico', '#ef4444'], ['warning', '🟡 Atenção', '#f59e0b'], ['info', '🔵 Info', '#3b82f6']].map(([k, l, cl]) => (
                <button key={k} onClick={() => setNewAlert({ ...newAlert, type: k })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: newAlert.type === k ? cl + '20' : 'rgba(255,255,255,0.03)', border: newAlert.type === k ? '1px solid ' + cl + '40' : '1px solid ' + T.bdr, color: newAlert.type === k ? cl : T.mt }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelS}>Mensagem</label>
            <input value={newAlert.message} onChange={e => setNewAlert({ ...newAlert, message: e.target.value })} placeholder="Ex: Conta Meta Ads bloqueada, Erro pagamento..." style={inputS} />
          </div>
          <div style={{ fontSize: 12, color: T.mt, marginBottom: 14 }}>
            Sugestões: Conta Meta bloqueada · Erro de pagamento Meta · Pixel com problema · Orçamento pausado · Domínio expirado
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowNewAlert(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={() => { addAlert(c.id); setShowNewAlert(false); setNewAlert({ type: 'error', message: '' }); }} disabled={!newAlert.message} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: newAlert.message ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.05)', color: newAlert.message ? '#fff' : T.mt, cursor: newAlert.message ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Criar Alerta</button>
          </div>
        </div>
      </div>
    )}
    </div>);
  }

  // ═══════════════════════════════════════════
  // HUB MAIN
  // ═══════════════════════════════════════════
  return (<div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: T.fn, display: 'flex' }}>{sidebar}
    <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto', maxHeight: '100vh' }}>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{squad === 'todos' ? '📋 Todos os Clientes' : (SQUADS as any)[squad]?.icon + ' ' + (SQUADS as any)[squad]?.label}</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
            {[['all', 'Todos'], ['alerts', '⚠️ Alertas']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === k ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === k ? '#a5b4fc' : T.mt }}>{l}</button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 8, padding: '8px 14px', color: T.tx, fontSize: 13, outline: 'none', width: 180 }} />
        </div>
      </div>

      {/* Client Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
        {filtered.map(c => {
          const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
          const alerts = (c.client_alerts || []).filter((a: any) => !a.resolved);
          const cTasks = tasks.filter(t => t.client_id === c.id && t.status !== 'feito');
          return (
            <div key={c.id} onClick={() => openC(c)} style={{ background: T.card, border: '1px solid ' + (alerts.length ? 'rgba(239,68,68,0.2)' : T.bdr), borderRadius: 14, padding: '18px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden', opacity: c.status === 'pausado' ? 0.4 : 1 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: sq.color, opacity: 0.4 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: sq.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: sq.color }}>{c.name?.charAt(0)}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 700 }}>{c.name}</div><div style={{ fontSize: 12, color: T.mt }}>{c.niche}</div></div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: c.status === 'ativo' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: c.status === 'ativo' ? '#22c55e' : '#ef4444' }}>{c.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: sq.color + '15', color: sq.color }}>{sq.icon} {sq.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{c.phase}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: '#22c55e15', color: '#22c55e' }}>{fB(c.fee)}/mês</span>
                {cTasks.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>✅ {cTasks.length}</span>}
              </div>
              {alerts.length > 0 && <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>{alerts.map((a: any) => <span key={a.id} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>🚨 {a.message?.slice(0, 30)}</span>)}</div>}
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: T.mt }}><div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div><div style={{ fontSize: 16, fontWeight: 600 }}>Nenhum cliente encontrado</div></div>}
    </main>

    {/* ═══ MODAL: New Client (inline, not a component — fixes freeze) ═══ */}
    {showNew && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNew(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 480, maxHeight: '85vh', overflowY: 'auto' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Novo Cliente</h2>
          {clientFields.map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <label style={labelS}>{f.l}</label>
              <input type={f.t || 'text'} value={(nc as any)[f.k] || ''} onChange={e => setNc({ ...nc, [f.k]: e.target.value })} style={inputS} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={labelS}>Squad</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {Object.entries(SQUADS).map(([k, v]) => (
                <button key={k} onClick={() => setNc({ ...nc, squad: k })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: nc.squad === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: nc.squad === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: nc.squad === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={addClient} disabled={!nc.name} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: nc.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nc.name ? '#fff' : T.mt, cursor: nc.name ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Adicionar</button>
          </div>
        </div>
      </div>
    )}

    {/* ═══ MODAL: New Task ═══ */}
    {showNewTask && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewTask(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Nova Tarefa</h2>
          <div style={{ marginBottom: 10 }}><label style={labelS}>Título</label><input value={nt.title} onChange={e => setNt({ ...nt, title: e.target.value })} style={inputS} /></div>
          <div style={{ marginBottom: 10 }}><label style={labelS}>Cliente</label><select value={nt.client_id} onChange={e => setNt({ ...nt, client_id: e.target.value })} style={inputS}><option value="" style={{ background: '#1a1a2e' }}>Geral</option>{clients.filter(c => c.status === 'ativo').map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name}</option>)}</select></div>
          <div style={{ marginBottom: 10 }}><label style={labelS}>Prioridade</label><div style={{ display: 'flex', gap: 4 }}>{['urgente', 'normal', 'baixa'].map(p => <button key={p} onClick={() => setNt({ ...nt, priority: p })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: nt.priority === p ? (PRIO as any)[p].bg : 'rgba(255,255,255,0.03)', border: nt.priority === p ? '1px solid ' + (PRIO as any)[p].color + '40' : '1px solid ' + T.bdr, color: nt.priority === p ? (PRIO as any)[p].color : T.mt, textTransform: 'capitalize' as const }}>{p}</button>)}</div></div>
          <div style={{ marginBottom: 16 }}><label style={labelS}>Prazo</label><input type="date" value={nt.due_date} onChange={e => setNt({ ...nt, due_date: e.target.value })} style={inputS} /></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowNewTask(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={addTask} disabled={!nt.title} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: nt.title ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nt.title ? '#fff' : T.mt, cursor: nt.title ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Criar</button>
          </div>
        </div>
      </div>
    )}

    {/* ═══ MODAL: New Meeting ═══ */}
    {showNewMeeting && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewMeeting(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Nova Reunião</h2>
          {[{ k: 'title', l: 'Título' }, { k: 'date', l: 'Data', t: 'date' }, { k: 'time', l: 'Horário', t: 'time' }, { k: 'link', l: 'Link Meet/Zoom' }].map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}><label style={labelS}>{f.l}</label><input type={f.t || 'text'} value={(nm as any)[f.k] || ''} onChange={e => setNm({ ...nm, [f.k]: e.target.value })} style={inputS} /></div>
          ))}
          <div style={{ marginBottom: 16 }}><label style={labelS}>Cliente</label><select value={nm.client_id} onChange={e => setNm({ ...nm, client_id: e.target.value })} style={inputS}><option value="" style={{ background: '#1a1a2e' }}>Geral</option>{clients.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name}</option>)}</select></div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowNewMeeting(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={addMeeting} disabled={!nm.title || !nm.date} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: nm.title && nm.date ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: nm.title && nm.date ? '#fff' : T.mt, cursor: nm.title && nm.date ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Agendar</button>
          </div>
        </div>
      </div>
    )}

    {/* ═══ MODAL: New Alert ═══ */}
    {showNewAlert && sel && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewAlert(false)}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>🚨 Novo Alerta — {sel.name}</h2>
          <div style={{ marginBottom: 12 }}>
            <label style={labelS}>Tipo</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['error', '🔴 Crítico', '#ef4444'], ['warning', '🟡 Atenção', '#f59e0b'], ['info', '🔵 Info', '#3b82f6']].map(([k, l, cl]) => (
                <button key={k} onClick={() => setNewAlert({ ...newAlert, type: k })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: newAlert.type === k ? cl + '20' : 'rgba(255,255,255,0.03)', border: newAlert.type === k ? '1px solid ' + cl + '40' : '1px solid ' + T.bdr, color: newAlert.type === k ? cl : T.mt }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelS}>Mensagem</label>
            <input value={newAlert.message} onChange={e => setNewAlert({ ...newAlert, message: e.target.value })} placeholder="Ex: Conta Meta Ads bloqueada, Erro pagamento..." style={inputS} />
          </div>
          <div style={{ fontSize: 12, color: T.mt, marginBottom: 14 }}>
            Sugestões: Conta Meta bloqueada · Erro de pagamento Meta · Pixel com problema · Orçamento pausado · Domínio expirado
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowNewAlert(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
            <button onClick={() => addAlert(sel.id)} disabled={!newAlert.message} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: newAlert.message ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.05)', color: newAlert.message ? '#fff' : T.mt, cursor: newAlert.message ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Criar Alerta</button>
          </div>
        </div>
      </div>
    )}
  </div>);
}
