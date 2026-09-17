'use client';

import { useState, useEffect, useCallback } from 'react';

const RESPONSIBLE_LABEL: Record<string, string> = { agency: 'Agência', client: 'Cliente' };
const STATUS_LABEL: Record<string, string> = { todo: 'A fazer', doing: 'Em andamento', done: 'Feito', not_done: 'Não feito' };
const STATUS_COLOR: Record<string, string> = { todo: 'rgba(255,255,255,0.3)', doing: '#f59e0b', done: '#22c55e', not_done: '#ef4444' };

function today() { return new Date().toISOString().slice(0, 10); }
function formatDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const emptyForm = { date: today(), title: '', responsible: 'agency', status: 'todo', justification: '', sort_order: 0, visible_to_client: true };

export default function ActivitiesSection({ clientId }: { clientId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
  const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px' };
  const btnPrimary = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 9, padding: '8px 16px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnDanger = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 11px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnGhost = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterDate
      ? `/api/portal/manage?client_id=${clientId}&section=activities&date=${filterDate}`
      : `/api/portal/manage?client_id=${clientId}&section=activities`;
    const res = await fetch(url);
    const data = await res.json();
    setActivities(data.activities || []);
    setLoading(false);
  }, [clientId, filterDate]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditId(null);
    setForm({ ...emptyForm, date: filterDate || today() });
    setShowForm(true);
  }

  function openEdit(a: any) {
    setEditId(a.id);
    setForm({ date: a.date, title: a.title, responsible: a.responsible, status: a.status, justification: a.justification || '', sort_order: a.sort_order, visible_to_client: a.visible_to_client });
    setShowForm(true);
  }

  async function saveActivity() {
    if (!form.title.trim()) return;
    if (form.status === 'not_done' && !form.justification.trim()) {
      alert('Justificativa obrigatória para status "Não feito".');
      return;
    }
    setSaving(true);
    const payload = editId
      ? { action: 'update_activity', activity_id: editId, ...form, justification: form.justification || null }
      : { action: 'add_activity', client_id: clientId, ...form, justification: form.justification || null };
    await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setSaving(false);
    setShowForm(false);
    setEditId(null);
    load();
  }

  async function remove(id: string) {
    await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'remove_activity', activity_id: id }) });
    setActivities(activities.filter(a => a.id !== id));
  }

  // Group by date
  const grouped: Record<string, any[]> = {};
  for (const a of activities) {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 160, fontSize: 12 }} />
        {filterDate && <button onClick={() => setFilterDate('')} style={btnGhost}>Limpar filtro</button>}
        <div style={{ flex: 1 }} />
        <button onClick={openAdd} style={btnPrimary}>+ Nova atividade</button>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{editId ? 'Editar atividade' : 'Nova atividade'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Data *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Título *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Descrição da atividade" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Responsável</label>
              <select value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} style={inp}>
                <option value="agency">Agência</option>
                <option value="client">Cliente</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Ordem</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} style={inp} />
            </div>
          </div>
          {form.status === 'not_done' && (
            <div>
              <label style={{ fontSize: 11, color: '#ef4444', display: 'block', marginBottom: 4 }}>Justificativa * (obrigatória para "Não feito")</label>
              <textarea value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Motivo pelo qual não foi feito..." />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            <input type="checkbox" checked={form.visible_to_client} onChange={e => setForm(f => ({ ...f, visible_to_client: e.target.checked }))} style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#a78bfa' }} />
            Visível para o cliente
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={saveActivity} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnGhost}>Cancelar</button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>
      ) : activities.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nenhuma atividade encontrada.</p>
      ) : (
        dates.map(date => (
          <div key={date}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{formatDate(date)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {grouped[date].map(a => (
                <div key={a.id} style={cardS}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{a.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                          {RESPONSIBLE_LABEL[a.responsible]}
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: `${STATUS_COLOR[a.status]}15`, color: STATUS_COLOR[a.status] }}>
                          {STATUS_LABEL[a.status]}
                        </span>
                        {!a.visible_to_client && (
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>oculto</span>
                        )}
                      </div>
                      {a.justification && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{a.justification}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => openEdit(a)} style={btnGhost}>Editar</button>
                      <button onClick={() => remove(a.id)} style={btnDanger}>Remover</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
