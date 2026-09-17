'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: '#F2F4F1', card: '#FFFFFF', secondary: '#EBEFE9', border: '#D7DDD6',
  text: '#121714', soft: '#5C6861', accent: '#3F6B00', accentBg: '#EBF2E0',
  ok: '#1E7F47', okBg: '#E4F5EC', error: '#B93B28', errorBg: '#FBEAE7',
  warn: '#8A5F00', warnBg: '#FFF8E6',
};
const fn = "'Space Grotesk', system-ui, sans-serif";
const fnTitle = "'Fraunces', Georgia, serif";

// ── Types ──────────────────────────────────────────────────────────────────────
type Report  = { id: string; kind: string; ref_date: string; title: string; content: string | null; created_at: string };
type Task    = { id: string; title: string; owner: string; status: string; note: string | null; due_date: string | null; created_at: string };
type Link    = { id: string; group_name: string; label: string; url: string };
type Launch  = { id: string; name: string; period: string | null; status: string; metrics: string | null; content: string | null };

// ── Constants ──────────────────────────────────────────────────────────────────
const KIND_LABEL: Record<string, string>                           = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' };
const KIND_COLOR: Record<string, { bg: string; text: string }>    = { diario: { bg: '#EEF2FF', text: '#3730A3' }, semanal: { bg: C.accentBg, text: C.accent }, mensal: { bg: C.okBg, text: C.ok } };
const TSTATUS_LABEL: Record<string, string>                        = { a_fazer: 'A fazer', fazendo: 'Fazendo', feito: 'Feito', nao_feito: 'Não feito' };
const TSTATUS_COLOR: Record<string, { bg: string; text: string }> = { a_fazer: { bg: C.secondary, text: C.soft }, fazendo: { bg: '#FEF3C7', text: '#92400E' }, feito: { bg: C.okBg, text: C.ok }, nao_feito: { bg: C.errorBg, text: C.error } };
const TSTATUS_CYCLE: Record<string, string>                        = { a_fazer: 'fazendo', fazendo: 'feito', feito: 'nao_feito', nao_feito: 'a_fazer' };
const TSTATUS_ORDER                                                 = ['a_fazer', 'fazendo', 'feito', 'nao_feito'];
const OWNER_LABEL: Record<string, string>                          = { agencia: 'Agência', cliente: 'Cliente' };
const LSTATUS_LABEL: Record<string, string>                        = { planejamento: 'Planejamento', em_andamento: 'Em andamento', concluido: 'Concluído', pausado: 'Pausado' };
const LSTATUS_COLOR: Record<string, { bg: string; text: string }> = { planejamento: { bg: '#EEF2FF', text: '#3730A3' }, em_andamento: { bg: '#FEF3C7', text: '#92400E' }, concluido: { bg: C.okBg, text: C.ok }, pausado: { bg: C.secondary, text: C.soft } };
const LINK_GROUPS = ['Páginas e checkout', 'Criativos', 'Swipe file e referências', 'Pastas e arquivos', 'Dashboards', 'Acessos'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

async function apiFetch(
  method: string, resource: string, slug: string,
  body?: Record<string, unknown>, extra?: Record<string, string>
) {
  const params = new URLSearchParams({ slug, ...extra });
  if (method === 'DELETE' && body?.id) params.set('id', String(body.id));
  const res = await fetch(`/api/portal/${resource}?${params}`, {
    method,
    headers: body && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {},
    body: body && method !== 'DELETE' ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Erro'); }
  return res.json();
}

// ── Markdown ──────────────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  })}</>;
}

function Markdown({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '12px 0 4px', color: C.text }}>{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, margin: '14px 0 4px', color: C.text }}>{line.slice(2)}</h2>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`} style={{ margin: '4px 0 8px', paddingLeft: 20 }}>{items}</ul>);
      continue;
    } else if (line.trim()) {
      nodes.push(<p key={i} style={{ margin: '0 0 6px', lineHeight: 1.65 }}>{renderInline(line)}</p>);
    }
    i++;
  }
  return <div style={{ fontSize: 14, color: C.text }}>{nodes}</div>;
}

// ── UI atoms ──────────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: { bg: string; text: string } }) {
  return <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, background: color.bg, color: color.text, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>;
}

function Btn({ children, onClick, type = 'button', variant = 'primary', small, disabled }: {
  children: React.ReactNode; onClick?: () => void; type?: 'button' | 'submit'; variant?: 'primary' | 'ghost' | 'danger'; small?: boolean; disabled?: boolean;
}) {
  const v: Record<string, React.CSSProperties> = {
    primary: { background: C.accent, color: '#fff', border: 'none' },
    ghost:   { background: 'transparent', color: C.soft, border: `1px solid ${C.border}` },
    danger:  { background: 'transparent', color: C.error, border: `1px solid ${C.errorBg}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...v[variant], fontFamily: fn, fontSize: small ? 12 : 14, fontWeight: 500, padding: small ? '4px 10px' : '8px 16px', borderRadius: 8, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8,
  border: `1px solid ${C.border}`, fontFamily: fn, fontSize: 14, color: C.text, background: C.bg,
};
const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 120, lineHeight: 1.6 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.soft, marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, onSubmit, saving, children }: {
  title: string; onClose: () => void; onSubmit: (e: React.FormEvent) => void; saving: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.22)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <form onSubmit={onSubmit} style={{ background: C.card, borderRadius: 14, padding: 28, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontFamily: fnTitle, fontSize: 20, fontWeight: 600, color: C.text, margin: 0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.soft }}>✕</button>
        </div>
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
        </div>
      </form>
    </div>
  );
}

function ActionRow({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <Btn small variant="ghost" onClick={onEdit}>Editar</Btn>
      <Btn small variant="danger" onClick={onDelete}>Excluir</Btn>
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ slug, clientName }: { slug: string; clientName: string }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, password: pw }) });
      if (res.ok) { router.refresh(); }
      else { const d = await res.json(); setErr(d.error || 'Senha incorreta'); }
    } catch { setErr('Erro ao conectar'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fn, padding: 16 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 40, width: '100%', maxWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        <h1 style={{ fontFamily: fnTitle, fontSize: 28, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>{clientName}</h1>
        <p style={{ color: C.soft, fontSize: 14, margin: '0 0 28px' }}>Portal do cliente</p>
        <form onSubmit={handleLogin}>
          <Field label="Senha de acesso">
            <input type="password" value={pw} onChange={e => setPw(e.target.value)} style={inputStyle} autoFocus />
          </Field>
          {err && <p style={{ color: C.error, fontSize: 13, margin: '0 0 12px' }}>{err}</p>}
          <button type="submit" style={{ background: C.accent, color: '#fff', border: 'none', fontFamily: fn, fontSize: 14, fontWeight: 600, padding: '10px 24px', borderRadius: 8, cursor: 'pointer', width: '100%' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Relatórios ───────────────────────────────────────────────────────────
type ReportForm = { kind: string; ref_date: string; title: string; content: string };
const reportFormDefault: ReportForm = { kind: 'semanal', ref_date: '', title: '', content: '' };

function TabReports({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: Report | null } | null>(null);
  const [form, setForm] = useState<ReportForm>(reportFormDefault);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch('GET', 'reports', slug, undefined, filter ? { kind: filter } : {});
      setReports(d.reports || []);
    } catch {} finally { setLoading(false); }
  }, [slug, filter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(reportFormDefault); setModal({ editing: null }); }
  function openEdit(r: Report) { setForm({ kind: r.kind, ref_date: r.ref_date, title: r.title, content: r.content || '' }); setModal({ editing: r }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.editing) await apiFetch('PUT', 'reports', slug, { id: modal.editing.id, ...form });
      else await apiFetch('POST', 'reports', slug, form);
      setModal(null); await load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(r: Report) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await apiFetch('DELETE', 'reports', slug, { id: r.id });
    await load();
  }

  const filterBtn = (v: string, label: string) => (
    <button onClick={() => setFilter(f => f === v ? '' : v)}
      style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${filter === v ? C.accent : C.border}`, background: filter === v ? C.accentBg : C.card, color: filter === v ? C.accent : C.soft, fontFamily: fn, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {filterBtn('diario', 'Diário')}
          {filterBtn('semanal', 'Semanal')}
          {filterBtn('mensal', 'Mensal')}
        </div>
        {isAdmin && <Btn onClick={openCreate}>+ Novo relatório</Btn>}
      </div>

      {loading ? <p style={{ color: C.soft }}>Carregando...</p> : reports.length === 0 ? (
        <p style={{ color: C.soft, fontSize: 14 }}>Nenhum relatório{filter ? ` ${KIND_LABEL[filter].toLowerCase()}` : ''} ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map(r => (
            <div key={r.id} style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Badge label={KIND_LABEL[r.kind] || r.kind} color={KIND_COLOR[r.kind] || { bg: C.secondary, text: C.soft }} />
                  <span style={{ fontSize: 12, color: C.soft }}>{fmtDate(r.ref_date)}</span>
                </div>
                {isAdmin && <ActionRow onEdit={() => openEdit(r)} onDelete={() => handleDelete(r)} />}
              </div>
              <h3 style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>{r.title}</h3>
              {r.content && <Markdown text={r.content} />}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.editing ? 'Editar relatório' : 'Novo relatório'} onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Tipo">
            <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} style={inputStyle}>
              <option value="diario">Diário</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </Field>
          <Field label="Data de referência">
            <input type="date" value={form.ref_date} onChange={e => setForm(f => ({ ...f, ref_date: e.target.value }))} style={inputStyle} required />
          </Field>
          <Field label="Título">
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} required />
          </Field>
          <Field label="Conteúdo (markdown: **negrito**, *itálico*, # título, - lista)">
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={taStyle} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Tarefas ──────────────────────────────────────────────────────────────
type TaskForm = { title: string; owner: string; status: string; due_date: string; note: string };
const taskFormDefault: TaskForm = { title: '', owner: 'agencia', status: 'a_fazer', due_date: '', note: '' };

function TabTasks({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: Task | null } | null>(null);
  const [form, setForm] = useState<TaskForm>(taskFormDefault);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('GET', 'tasks', slug); setTasks(d.tasks || []); }
    catch {} finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(taskFormDefault); setModal({ editing: null }); }
  function openEdit(t: Task) {
    setForm({ title: t.title, owner: t.owner, status: t.status, due_date: t.due_date || '', note: t.note || '' });
    setModal({ editing: t });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, due_date: form.due_date || null, note: form.note || null };
      if (modal?.editing) await apiFetch('PUT', 'tasks', slug, { id: modal.editing.id, ...payload });
      else await apiFetch('POST', 'tasks', slug, payload);
      setModal(null); await load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(t: Task) {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    await apiFetch('DELETE', 'tasks', slug, { id: t.id }); await load();
  }

  async function cycleStatus(t: Task) {
    const next = TSTATUS_CYCLE[t.status] || 'a_fazer';
    setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: next } : x));
    try { await apiFetch('PUT', 'tasks', slug, { id: t.id, status: next }); }
    catch { setTasks(prev => prev.map(x => x.id === t.id ? { ...x, status: t.status } : x)); }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        {isAdmin && <Btn onClick={openCreate}>+ Nova tarefa</Btn>}
      </div>

      {loading ? <p style={{ color: C.soft }}>Carregando...</p> : tasks.length === 0 ? (
        <p style={{ color: C.soft, fontSize: 14 }}>Nenhuma tarefa ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {TSTATUS_ORDER.map(status => {
            const group = tasks.filter(t => t.status === status);
            if (group.length === 0) return null;
            return (
              <div key={status}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Badge label={TSTATUS_LABEL[status]} color={TSTATUS_COLOR[status]} />
                  <span style={{ fontSize: 13, color: C.soft }}>{group.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.map(t => (
                    <div key={t.id} style={{ background: C.card, borderRadius: 10, padding: '14px 16px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: t.note || t.due_date ? 6 : 0 }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{t.title}</span>
                          <span style={{ fontSize: 12, color: C.soft, background: C.secondary, padding: '1px 8px', borderRadius: 10 }}>{OWNER_LABEL[t.owner] || t.owner}</span>
                          {t.due_date && <span style={{ fontSize: 12, color: C.soft }}>até {fmtDate(t.due_date)}</span>}
                        </div>
                        {t.note && <p style={{ margin: 0, fontSize: 13, color: C.soft, lineHeight: 1.5 }}>{t.note}</p>}
                      </div>
                      {isAdmin && (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => cycleStatus(t)}
                            style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}`, background: TSTATUS_COLOR[t.status].bg, color: TSTATUS_COLOR[t.status].text, fontFamily: fn, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {TSTATUS_LABEL[t.status]}
                          </button>
                          <Btn small variant="ghost" onClick={() => openEdit(t)}>Editar</Btn>
                          <Btn small variant="danger" onClick={() => handleDelete(t)}>Excluir</Btn>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.editing ? 'Editar tarefa' : 'Nova tarefa'} onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Título">
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Responsável">
              <select value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} style={inputStyle}>
                <option value="agencia">Agência</option>
                <option value="cliente">Cliente</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                {TSTATUS_ORDER.map(s => <option key={s} value={s}>{TSTATUS_LABEL[s]}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Prazo (opcional)">
            <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputStyle} />
          </Field>
          <Field label="Observação (opcional)">
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ ...taStyle, minHeight: 80 }} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Links ────────────────────────────────────────────────────────────────
type LinkForm = { group_name: string; label: string; url: string };
const linkFormDefault: LinkForm = { group_name: '', label: '', url: '' };

function TabLinks({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: Link | null } | null>(null);
  const [form, setForm] = useState<LinkForm>(linkFormDefault);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('GET', 'links', slug); setLinks(d.links || []); }
    catch {} finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(linkFormDefault); setModal({ editing: null }); }
  function openEdit(l: Link) { setForm({ group_name: l.group_name, label: l.label, url: l.url }); setModal({ editing: l }); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.editing) await apiFetch('PUT', 'links', slug, { id: modal.editing.id, ...form });
      else await apiFetch('POST', 'links', slug, form);
      setModal(null); await load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(l: Link) {
    if (!confirm(`Excluir "${l.label}"?`)) return;
    await apiFetch('DELETE', 'links', slug, { id: l.id }); await load();
  }

  // group links
  const groups = Array.from(new Set(links.map(l => l.group_name)));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        {isAdmin && <Btn onClick={openCreate}>+ Novo link</Btn>}
      </div>

      {loading ? <p style={{ color: C.soft }}>Carregando...</p> : links.length === 0 ? (
        <p style={{ color: C.soft, fontSize: 14 }}>Nenhum link ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.map(group => (
            <div key={group}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px' }}>{group}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {links.filter(l => l.group_name === group).map(l => (
                  <div key={l.id} style={{ background: C.card, borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: C.accent, fontWeight: 600, fontSize: 14, textDecoration: 'none', flex: 1 }}>
                      {l.label}
                      <span style={{ fontSize: 12, color: C.soft, fontWeight: 400, marginLeft: 8 }}>{new URL(l.url).hostname}</span>
                    </a>
                    {isAdmin && <ActionRow onEdit={() => openEdit(l)} onDelete={() => handleDelete(l)} />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.editing ? 'Editar link' : 'Novo link'} onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Grupo">
            <input list="link-groups" type="text" value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} style={inputStyle} required placeholder="ex: Dashboards" />
            <datalist id="link-groups">{LINK_GROUPS.map(g => <option key={g} value={g} />)}</datalist>
          </Field>
          <Field label="Título">
            <input type="text" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inputStyle} required />
          </Field>
          <Field label="URL">
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} style={inputStyle} required placeholder="https://" />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Lançamentos ──────────────────────────────────────────────────────────
type LaunchForm = { name: string; period: string; status: string; metrics: string; content: string };
const launchFormDefault: LaunchForm = { name: '', period: '', status: 'planejamento', metrics: '', content: '' };

function TabLaunches({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ editing: Launch | null } | null>(null);
  const [form, setForm] = useState<LaunchForm>(launchFormDefault);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('GET', 'launches', slug); setLaunches(d.launches || []); }
    catch {} finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setForm(launchFormDefault); setModal({ editing: null }); }
  function openEdit(l: Launch) {
    setForm({ name: l.name, period: l.period || '', status: l.status, metrics: l.metrics || '', content: l.content || '' });
    setModal({ editing: l });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, period: form.period || null, metrics: form.metrics || null, content: form.content || null };
      if (modal?.editing) await apiFetch('PUT', 'launches', slug, { id: modal.editing.id, ...payload });
      else await apiFetch('POST', 'launches', slug, payload);
      setModal(null); await load();
    } catch (err: unknown) { alert(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(l: Launch) {
    if (!confirm(`Excluir "${l.name}"?`)) return;
    await apiFetch('DELETE', 'launches', slug, { id: l.id }); await load();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        {isAdmin && <Btn onClick={openCreate}>+ Novo lançamento</Btn>}
      </div>

      {loading ? <p style={{ color: C.soft }}>Carregando...</p> : launches.length === 0 ? (
        <p style={{ color: C.soft, fontSize: 14 }}>Nenhum lançamento ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {launches.map(l => (
            <div key={l.id} style={{ background: C.card, borderRadius: 12, padding: 20, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
                <div>
                  <h3 style={{ fontFamily: fnTitle, fontSize: 18, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>{l.name}</h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={LSTATUS_LABEL[l.status] || l.status} color={LSTATUS_COLOR[l.status] || { bg: C.secondary, text: C.soft }} />
                    {l.period && <span style={{ fontSize: 13, color: C.soft }}>{l.period}</span>}
                  </div>
                </div>
                {isAdmin && <ActionRow onEdit={() => openEdit(l)} onDelete={() => handleDelete(l)} />}
              </div>
              {l.metrics && (
                <div style={{ background: C.secondary, borderRadius: 8, padding: '10px 14px', marginBottom: 10, fontSize: 14, color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {l.metrics}
                </div>
              )}
              {l.content && <Markdown text={l.content} />}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.editing ? 'Editar lançamento' : 'Novo lançamento'} onClose={() => setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Nome">
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} required />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Período (ex: set/2026)">
              <input type="text" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inputStyle}>
                <option value="planejamento">Planejamento</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="pausado">Pausado</option>
              </select>
            </Field>
          </div>
          <Field label="Números (métricas, resultados)">
            <textarea value={form.metrics} onChange={e => setForm(f => ({ ...f, metrics: e.target.value }))} style={{ ...taStyle, minHeight: 80 }} placeholder="Investimento: R$ 5.000&#10;Faturamento: R$ 22.000&#10;ROAS: 4,4x" />
          </Field>
          <Field label="Otimizações, ideias e aprendizados (markdown)">
            <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} style={taStyle} />
          </Field>
        </Modal>
      )}
    </div>
  );
}

// ── Main PortalClient ─────────────────────────────────────────────────────────
interface PortalProps {
  portal: { clients: { name: string } | { name: string }[] };
  isLoggedIn: boolean;
  isAdmin: boolean;
  slug: string;
  clientId: string;
}

export default function PortalClient({ portal, isLoggedIn, isAdmin, slug }: PortalProps) {
  const [tab, setTab] = useState<'relatorios' | 'tarefas' | 'links' | 'lancamentos'>('relatorios');
  const router = useRouter();

  const clientName = (() => {
    const c = portal.clients;
    if (Array.isArray(c)) return c[0]?.name || 'Portal';
    return (c as { name: string })?.name || 'Portal';
  })();

  if (!isLoggedIn) return <LoginScreen slug={slug} clientName={clientName} />;

  const TABS = [
    { id: 'relatorios' as const,   label: 'Relatórios' },
    { id: 'tarefas' as const,      label: 'Tarefas' },
    { id: 'links' as const,        label: 'Links' },
    { id: 'lancamentos' as const,  label: 'Lançamentos' },
  ];

  async function logout() {
    await fetch('/api/portal/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
    router.refresh();
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: fn }}>
      {/* Header */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontFamily: fnTitle, fontSize: 18, fontWeight: 600, color: C.text }}>{clientName}</span>
            {isAdmin && <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentBg, padding: '2px 8px', borderRadius: 10, letterSpacing: '0.04em' }}>ADMIN</span>}
          </div>
          <button onClick={logout} style={{ background: 'none', border: 'none', fontFamily: fn, fontSize: 13, color: C.soft, cursor: 'pointer' }}>Sair</button>
        </div>
        {/* Tabs */}
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ background: 'none', border: 'none', fontFamily: fn, fontSize: 14, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? C.accent : C.soft, padding: '12px 16px', cursor: 'pointer', borderBottom: tab === t.id ? `2px solid ${C.accent}` : '2px solid transparent', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px' }}>
        {tab === 'relatorios'  && <TabReports   slug={slug} isAdmin={isAdmin} />}
        {tab === 'tarefas'     && <TabTasks      slug={slug} isAdmin={isAdmin} />}
        {tab === 'links'       && <TabLinks      slug={slug} isAdmin={isAdmin} />}
        {tab === 'lancamentos' && <TabLaunches   slug={slug} isAdmin={isAdmin} />}
      </main>
    </div>
  );
}
