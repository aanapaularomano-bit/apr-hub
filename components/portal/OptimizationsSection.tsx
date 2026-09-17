'use client';
import { useState, useEffect, useCallback } from 'react';

const OPT_TYPES = ['Orçamento', 'Segmentação', 'Criativo', 'Lance', 'Estrutura', 'Página', 'Outro'];

const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const btnP = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 8, padding: '7px 14px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnD = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 10px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

function today() { return new Date().toISOString().slice(0, 10); }
function fmtDate(d?: string | null) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const emptyForm = { date: today(), type: 'Criativo', campaign: '', what_done: '', why: '', result: '', visible_to_client: true };

export default function OptimizationsSection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const api = useCallback(async (body: any) => {
    const res = await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const url = filterDate
      ? `/api/portal/manage?client_id=${clientId}&section=optimizations&date=${filterDate}`
      : `/api/portal/manage?client_id=${clientId}&section=optimizations`;
    const d = await fetch(url).then(r => r.json());
    setItems(d.optimizations || []);
    setLoading(false);
  }, [clientId, filterDate]);

  useEffect(() => { load(); }, [load]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500); }
  function openAdd() { setEditId(null); setForm({ ...emptyForm, date: filterDate || today() }); setShowForm(true); }
  function openEdit(o: any) {
    setEditId(o.id);
    setForm({ date: o.date, type: o.type || 'Outro', campaign: o.campaign || '', what_done: o.what_done || '', why: o.why || '', result: o.result || '', visible_to_client: o.visible_to_client });
    setShowForm(true);
  }

  async function save() {
    if (!form.what_done.trim()) return;
    setSaving(true);
    const base = { ...form, campaign: form.campaign || null, why: form.why || null, result: form.result || null, client_id: clientId };
    const body = editId ? { action: 'update_optimization', optimization_id: editId, ...base } : { action: 'add_optimization', ...base };
    const d = await api(body);
    setSaving(false);
    if (d.error) { flash(d.error); return; }
    setShowForm(false); setEditId(null);
    flash(editId ? 'Atualizado.' : 'Criado.');
    load();
  }

  async function remove(id: string) {
    if (!confirm('Remover esta otimização?')) return;
    await api({ action: 'remove_optimization', optimization_id: id, client_id: clientId });
    load();
  }

  const grouped: Record<string, any[]> = {};
  for (const o of items) { if (!grouped[o.date]) grouped[o.date] = []; grouped[o.date].push(o); }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <button onClick={openAdd} style={btnP}>+ Nova otimização</button>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inp, width: 150, fontSize: 12 }} />
        {filterDate && <button onClick={() => setFilterDate('')} style={btnG}>Limpar</button>}
        {msg && <span style={{ fontSize: 12, color: '#22c55e' }}>{msg}</span>}
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{editId ? 'Editar otimização' : 'Nova otimização'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Data *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={inp}>
                {OPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Campanha</label>
              <input value={form.campaign} onChange={e => setForm(f => ({ ...f, campaign: e.target.value }))} style={inp} placeholder="Nome da campanha (opcional)" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>O que foi feito *</label>
            <textarea value={form.what_done} onChange={e => setForm(f => ({ ...f, what_done: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Descreva a otimização realizada..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Por quê</label>
              <textarea value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Justificativa..." />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Resultado</label>
              <textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Resultado observado..." />
            </div>
          </div>
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

      {!loading && items.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 12px' }}>Nenhuma otimização registrada.</p>
          <button onClick={openAdd} style={btnP}>+ Nova otimização</button>
        </div>
      )}

      {loading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>}

      {dates.map(date => (
        <div key={date}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{fmtDate(date)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[date].map(o => (
              <div key={o.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{o.what_done}</span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>{o.type}</span>
                    {o.campaign && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{o.campaign}</span>}
                    {!o.visible_to_client && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>oculto</span>}
                  </div>
                  {o.why && <p style={{ margin: '2px 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Por quê: {o.why}</p>}
                  {o.result && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Resultado: {o.result}</p>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(o)} style={btnG}>Editar</button>
                  <button onClick={() => remove(o.id)} style={btnD}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
