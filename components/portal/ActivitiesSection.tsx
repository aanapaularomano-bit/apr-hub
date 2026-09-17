'use client';
import { useState, useEffect, useCallback } from 'react';

const STATUS_OPT = [
  { v: 'todo', l: 'A fazer', c: 'rgba(255,255,255,0.4)' },
  { v: 'doing', l: 'Em andamento', c: '#f59e0b' },
  { v: 'done', l: 'Feito', c: '#22c55e' },
  { v: 'not_done', l: 'Não feito', c: '#ef4444' },
];
const RESP_OPT = [{ v: 'agency', l: 'Agência' }, { v: 'client', l: 'Cliente' }];

const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const btnP = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 8, padding: '7px 14px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnD = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 10px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d?: string | null) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const emptyForm = { date: today(), title: '', responsible: 'agency', status: 'todo', justification: '', sort_order: 0, visible_to_client: true };

export default function ActivitiesSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterResp, setFilterResp] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const api = useCallback(async (body: any) => {
    const res = await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterDate
      ? `/api/portal/manage?client_id=${clientId}&section=activities&date=${filterDate}`
      : `/api/portal/manage?client_id=${clientId}&section=activities`;
    const d = await fetch(url).then(r => r.json());
    setItems(d.activities || []);
    setLoading(false);
  }, [clientId, filterDate]);

  useEffect(() => { load(); }, [load]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500); }

  function openAdd() { setEditId(null); setForm({ ...emptyForm, date: filterDate || today() }); setShowForm(true); }
  function openEdit(a: any) {
    setEditId(a.id);
    setForm({ date: a.date, title: a.title, responsible: a.responsible, status: a.status, justification: a.justification || '', sort_order: a.sort_order, visible_to_client: a.visible_to_client });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    if (form.status === 'not_done' && !form.justification.trim()) { flash('Justificativa obrigatória para "Não feito".'); return; }
    setSaving(true);
    const base = { ...form, justification: form.justification || null, client_id: clientId };
    const body = editId ? { action: 'update_activity', activity_id: editId, ...base } : { action: 'add_activity', ...base };
    const d = await api(body);
    setSaving(false);
    if (d.error) { flash(d.error); return; }
    setShowForm(false); setEditId(null);
    flash(editId ? 'Atividade atualizada.' : 'Atividade criada.');
    load();
  }

  async function quickStatus(a: any, status: string) {
    await api({ action: 'update_activity', activity_id: a.id, client_id: clientId, title: a.title, responsible: a.responsible, status, justification: a.justification || null, sort_order: a.sort_order, visible_to_client: a.visible_to_client, date: a.date });
    load();
  }

  async function duplicate(a: any) {
    await api({ action: 'duplicate_activity', activity_id: a.id, client_id: clientId, new_date: a.date });
    flash('Duplicada.'); load();
  }

  async function remove(id: string) {
    if (!confirm('Remover esta atividade?')) return;
    await api({ action: 'remove_activity', activity_id: id, client_id: clientId });
    load();
  }

  const filtered = items.filter(a => {
    if (filterResp && a.responsible !== filterResp) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  const grouped: Record<string, any[]> = {};
  for (const a of filtered) { if (!grouped[a.date]) grouped[a.date] = []; grouped[a.date].push(a); }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <button onClick={openAdd} style={btnP}>+ Nova atividade</button>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 150, fontSize: 12 }} />
        <select value={filterResp} onChange={e => setFilterResp(e.target.value)} style={{ ...inp, width: 120, fontSize: 12 }}>
          <option value="">Todos</option>
          {RESP_OPT.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 140, fontSize: 12 }}>
          <option value="">Todos os status</option>
          {STATUS_OPT.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        {(filterDate || filterResp || filterStatus) && <button onClick={() => { setFilterDate(''); setFilterResp(''); setFilterStatus(''); }} style={btnG}>Limpar</button>}
        {msg && <span style={{ fontSize: 12, color: msg.includes('obrigatória') || msg.includes('error') ? '#ef4444' : '#22c55e' }}>{msg}</span>}
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{editId ? 'Editar atividade' : 'Nova atividade'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Data *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Descrição da atividade" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Responsável</label>
              <select value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} style={inp}>
                {RESP_OPT.map(r => <option key={r.v} value={r.v}>{r.l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                {STATUS_OPT.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Ordem</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} style={inp} />
            </div>
          </div>
          {form.status === 'not_done' && (
            <div>
              <label style={{ fontSize: 11, color: '#ef4444', display: 'block', marginBottom: 4 }}>Justificativa * (obrigatória)</label>
              <textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <input type="checkbox" checked={form.visible_to_client} onChange={e => setForm(f => ({ ...f, visible_to_client: e.target.checked }))} style={{ accentColor: '#a78bfa', width: 14, height: 14 }} />
            Visível para o cliente
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnG}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 12px' }}>Nenhuma atividade cadastrada.</p>
          <button onClick={openAdd} style={btnP}>+ Nova atividade</button>
        </div>
      )}

      {loading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>}

      {/* List */}
      {dates.map(date => (
        <div key={date}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{fmtDate(date)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[date].map(a => {
              const sc = STATUS_OPT.find(s => s.v === a.status);
              return (
                <div key={a.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{a.title}</span>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                        {a.responsible === 'agency' ? 'Agência' : 'Cliente'}
                      </span>
                      {!a.visible_to_client && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>oculto</span>}
                    </div>
                    {a.justification && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{a.justification}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <select value={a.status} onChange={e => quickStatus(a, e.target.value)}
                      style={{ ...inp, width: 'auto', fontSize: 11, padding: '4px 7px', color: sc?.c || '#e2e8f0' }}>
                      {STATUS_OPT.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                    </select>
                    <button onClick={() => openEdit(a)} style={btnG}>Editar</button>
                    <button onClick={() => duplicate(a)} style={btnG}>Duplicar</button>
                    <button onClick={() => remove(a.id)} style={btnD}>Remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
