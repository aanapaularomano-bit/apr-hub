'use client';
import { useState, useCallback } from 'react';

const STATUS_LIST = ['pendente', 'em_andamento', 'concluido', 'cancelado'];
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const STATUS_COLOR: Record<string, string> = { pendente: '#f59e0b', em_andamento: '#60a5fa', concluido: '#22c55e', cancelado: '#6b7280' };

const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 8 };
const btnP = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 8, padding: '7px 14px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnD = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 10px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

function formatDate(d?: string | null) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; }

const emptyForm = { title: '', details: '', due_date: '', status: 'pendente', note: '' };

export default function RequestsSection({ clientId, requests, onReload }: { clientId: string; requests: any[]; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const api = useCallback(async (body: any) => {
    const res = await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); }
  function openEdit(r: any) {
    setEditId(r.id);
    setForm({ title: r.title, details: r.details || '', due_date: r.due_date || '', status: r.status, note: r.note || '' });
    setShowForm(true);
  }

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    const body = editId
      ? { action: 'update_request', request_id: editId, client_id: clientId, ...form, details: form.details || null, due_date: form.due_date || null, note: form.note || null }
      : { action: 'add_request', client_id: clientId, title: form.title, details: form.details || null, due_date: form.due_date || null };
    const d = await api(body);
    setSaving(false);
    if (d.error) { setMsg(d.error); return; }
    setShowForm(false); setEditId(null);
    flash(editId ? 'Solicitação atualizada.' : 'Solicitação criada.');
    onReload();
  }

  async function quickStatus(id: string, status: string, existing: any) {
    await api({ action: 'update_request', request_id: id, client_id: clientId, title: existing.title, details: existing.details || null, due_date: existing.due_date || null, status, note: existing.note || null });
    onReload();
  }

  async function remove(id: string) {
    if (!confirm('Remover esta solicitação?')) return;
    await api({ action: 'remove_request', request_id: id, client_id: clientId });
    onReload();
  }

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500); }

  const agency = requests.filter(r => r.from === 'agency');
  const client = requests.filter(r => r.from === 'client');

  function ReqCard({ r }: { r: any }) {
    return (
      <div style={cardS}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{r.title}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: `${STATUS_COLOR[r.status]}20`, color: STATUS_COLOR[r.status] }}>
                {STATUS_LABEL[r.status]}
              </span>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: r.from === 'agency' ? 'rgba(167,139,250,0.1)' : 'rgba(34,197,94,0.1)', color: r.from === 'agency' ? '#a78bfa' : '#22c55e' }}>
                {r.from === 'agency' ? 'Agência → Cliente' : 'Cliente → Agência'}
              </span>
            </div>
            {r.details && <p style={{ margin: '0 0 2px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{r.details}</p>}
            {r.note && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{r.note}</p>}
            {r.due_date && <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Prazo: {formatDate(r.due_date)}</p>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
            <select value={r.status} onChange={e => quickStatus(r.id, e.target.value, r)}
              style={{ ...inp, width: 'auto', fontSize: 11, padding: '4px 7px' }}>
              {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => openEdit(r)} style={btnG}>Editar</button>
              <button onClick={() => remove(r.id)} style={btnD}>Remover</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={openAdd} style={btnP}>+ Novo pedido ao cliente</button>
        {msg && <span style={{ fontSize: 12, color: '#22c55e' }}>{msg}</span>}
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{editId ? 'Editar solicitação' : 'Nova solicitação'}</p>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Título *" />
          <textarea value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Detalhes (opcional)" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Prazo</label>
              <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
            </div>
            {editId && (
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                  {STATUS_LIST.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            )}
          </div>
          {editId && (
            <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Observação / resposta para o cliente" />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnG}>Cancelar</button>
          </div>
        </div>
      )}

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Pedidos da agência ao cliente ({agency.length})</p>
        {agency.length === 0
          ? <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 10px' }}>Nenhum pedido criado.</p>
              <button onClick={openAdd} style={btnP}>+ Criar pedido</button>
            </div>
          : agency.map(r => <ReqCard key={r.id} r={r} />)}
      </div>

      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Pedidos do cliente à agência ({client.length})</p>
        {client.length === 0
          ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nenhum pedido recebido do cliente.</p>
          : client.map(r => <ReqCard key={r.id} r={r} />)}
      </div>
    </div>
  );
}
