'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME as T, fB } from '@/lib/constants';

const btnS = (color: string, extra?: any) => ({
  background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10,
  padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra,
});
const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };

const COLUMNS = [
  { key: 'entrar_contato', label: 'Entrar em Contato', color: '#64748b', icon: '📞' },
  { key: 'aguardando_retorno', label: 'Aguardando Retorno', color: '#ef4444', icon: '⏳' },
  { key: 'reuniao_agendada', label: 'Reunião Agendada', color: '#f59e0b', icon: '📅' },
  { key: 'respondido', label: 'Respondido', color: '#3b82f6', icon: '💬' },
  { key: 'proposta_enviada', label: 'Proposta Enviada', color: '#8b5cf6', icon: '📄' },
  { key: 'fechado', label: 'Fechado ✅', color: '#22c55e', icon: '🎉' },
];

const TEMP = {
  frio: { label: 'Frio', color: '#3b82f6', icon: '🧊' },
  morno: { label: 'Morno', color: '#f59e0b', icon: '🌤️' },
  quente: { label: 'Quente', color: '#ef4444', icon: '🔥' },
};

const COMO_ACHOU = ['Instagram', 'Indicação', 'Google', 'Anúncio', 'LinkedIn', 'Evento', 'Outro'];

export default function Prospects({ user }: { user: any }) {
  const [prospects, setProspects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [np, setNp] = useState({ name: '', tipo_negocio: '', faturamento_medio: '', quanto_investe: '', como_achou: '', temperatura: 'morno', whatsapp: '', email: '', instagram: '', notas: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('prospects').select('*').order('created_at', { ascending: false });
    setProspects(data || []);
    setLoading(false);
  }

  async function addProspect() {
    if (!np.name) return;
    const { data } = await supabase.from('prospects').insert({ ...np, status: 'entrar_contato', data_contato: new Date().toISOString().split('T')[0], user_id: user.id }).select().single();
    if (data) setProspects([data, ...prospects]);
    setNp({ name: '', tipo_negocio: '', faturamento_medio: '', quanto_investe: '', como_achou: '', temperatura: 'morno', whatsapp: '', email: '', instagram: '', notas: '' });
    setShowNew(false);
  }

  async function updateProspect(id: string, updates: any) {
    await supabase.from('prospects').update({ ...updates, ultimo_contato: new Date().toISOString().split('T')[0] }).eq('id', id);
    setProspects(prospects.map(p => p.id === id ? { ...p, ...updates } : p));
    if (showDetail?.id === id) setShowDetail({ ...showDetail, ...updates });
  }

  async function deleteProspect(id: string) {
    await supabase.from('prospects').delete().eq('id', id);
    setProspects(prospects.filter(p => p.id !== id));
    setShowDetail(null);
  }

  async function moveToClient(prospect: any) {
    // This would create a client from prospect - for now just mark as fechado
    await updateProspect(prospect.id, { status: 'fechado' });
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt, fontSize: 15 }}>Carregando prospects...</div>;

  // Detail view
  if (showDetail) {
    const p = prospects.find(x => x.id === showDetail.id) || showDetail;
    const temp = (TEMP as any)[p.temperatura] || TEMP.morno;
    const col = COLUMNS.find(c => c.key === p.status) || COLUMNS[0];

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setShowDetail(null); setEditing(false); }} style={btnS('#a78bfa')}>← Voltar</button>
          <button onClick={() => setEditing(!editing)} style={btnS('#3b82f6')}>{editing ? 'Cancelar' : '✏️ Editar'}</button>
          <button onClick={() => { if (confirm('Excluir ' + p.name + '?')) deleteProspect(p.id); }} style={btnS('#ef4444', { marginLeft: 'auto' })}>🗑️ Excluir</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: col.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: col.color }}>{p.name?.charAt(0)}</div>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{p.name}</h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: col.color + '15', color: col.color }}>{col.icon} {col.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: temp.color + '15', color: temp.color }}>{temp.icon} {temp.label}</span>
            </div>
          </div>
        </div>

        {/* Status change */}
        <div style={{ marginBottom: 18 }}>
          <label style={labelS}>Mover para</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {COLUMNS.map(c => (
              <button key={c.key} onClick={() => updateProspect(p.id, { status: c.key })} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: p.status === c.key ? c.color + '20' : 'rgba(255,255,255,0.03)', border: p.status === c.key ? '1px solid ' + c.color + '40' : '1px solid ' + T.bdr, color: p.status === c.key ? c.color : T.mt }}>{c.icon} {c.label}</button>
            ))}
          </div>
        </div>

        {editing ? (
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { k: 'name', l: 'Nome' },
                { k: 'tipo_negocio', l: 'Tipo de Negócio' },
                { k: 'faturamento_medio', l: 'Faturamento Médio' },
                { k: 'quanto_investe', l: 'Quanto Investe em Ads' },
                { k: 'whatsapp', l: 'WhatsApp' },
                { k: 'email', l: 'Email' },
                { k: 'instagram', l: 'Instagram' },
              ].map(f => (
                <div key={f.k}>
                  <label style={labelS}>{f.l}</label>
                  <input value={p[f.k] || ''} onChange={e => updateProspect(p.id, { [f.k]: e.target.value })} style={inputS} />
                </div>
              ))}
              <div>
                <label style={labelS}>Como me achou</label>
                <select value={p.como_achou || ''} onChange={e => updateProspect(p.id, { como_achou: e.target.value })} style={inputS}>
                  <option value="" style={{ background: '#1a1a2e' }}>—</option>
                  {COMO_ACHOU.map(c => <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Temperatura</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Object.entries(TEMP).map(([k, v]) => (
                    <button key={k} onClick={() => updateProspect(p.id, { temperatura: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: p.temperatura === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: p.temperatura === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: p.temperatura === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelS}>Notas</label>
                <textarea value={p.notas || ''} onChange={e => updateProspect(p.id, { notas: e.target.value })} rows={3} style={{ ...inputS, resize: 'vertical' as const }} />
              </div>
            </div>
            <button onClick={() => setEditing(false)} style={{ ...btnS('#22c55e'), marginTop: 14 }}>💾 Salvo automaticamente</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Dados</h3>
              {[
                ['Tipo de Negócio', p.tipo_negocio],
                ['Faturamento Médio', p.faturamento_medio],
                ['Quanto Investe', p.quanto_investe],
                ['Como me achou', p.como_achou],
                ['Temperatura', temp.icon + ' ' + temp.label],
                ['Primeiro Contato', p.data_contato ? new Date(p.data_contato + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
                ['Último Contato', p.ultimo_contato ? new Date(p.ultimo_contato + 'T12:00:00').toLocaleDateString('pt-BR') : '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + T.bdr }}>
                  <span style={{ fontSize: 13, color: T.mt }}>{l}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Contato</h3>
              {[
                { l: 'WhatsApp', v: p.whatsapp, icon: '💬', color: '#25D366' },
                { l: 'Email', v: p.email, icon: '📧', color: '#3b82f6' },
                { l: 'Instagram', v: p.instagram, icon: '📱', color: '#e1306c' },
              ].map(c => c.v ? (
                <a key={c.l} href={c.l === 'WhatsApp' ? 'https://wa.me/' + c.v.replace(/\D/g, '') : c.l === 'Email' ? 'mailto:' + c.v : 'https://instagram.com/' + c.v.replace('@', '')} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: c.color + '10', border: '1px solid ' + c.color + '25', borderRadius: 10, textDecoration: 'none', color: T.tx, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{c.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{c.v}</span>
                  <span style={{ fontSize: 13, color: c.color }}>→</span>
                </a>
              ) : (
                <div key={c.l} style={{ padding: '10px 0', borderBottom: '1px solid ' + T.bdr }}>
                  <span style={{ fontSize: 13, color: T.mt }}>{c.icon} {c.l}: —</span>
                </div>
              ))}
              {p.notas && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, color: T.mt, marginBottom: 4 }}>📝 Notas</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>{p.notas}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Pipeline view
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🎯 Prospects — Pipeline de Vendas</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.mt }}>{prospects.length} prospects · {prospects.filter(p => p.status === 'fechado').length} fechados</span>
          <button onClick={() => setShowNew(true)} style={btnS('#22c55e')}>+ Novo Prospect</button>
        </div>
      </div>

      {/* Pipeline Kanban */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10 }}>
        {COLUMNS.map(col => {
          const colProspects = prospects.filter(p => p.status === col.key);
          return (
            <div key={col.key}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = col.color + '08'; }}
              onDragLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; if (dragId) { updateProspect(dragId, { status: col.key }); setDragId(null); } }}
              style={{ minWidth: 220, flex: 1, background: 'rgba(255,255,255,0.015)', border: '1px solid ' + T.bdr, borderRadius: 14, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.color }} />
                <span style={{ fontSize: 13, fontWeight: 700 }}>{col.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: col.color + '15', color: col.color, padding: '2px 7px', borderRadius: 5, marginLeft: 'auto' }}>{colProspects.length}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                {colProspects.map(p => {
                  const temp = (TEMP as any)[p.temperatura] || TEMP.morno;
                  return (
                    <div key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragEnd={() => setDragId(null)}
                      onClick={() => setShowDetail(p)}
                      style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '12px 14px', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                        <span style={{ fontSize: 12 }}>{temp.icon}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.tipo_negocio && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{p.tipo_negocio}</span>}
                        {p.faturamento_medio && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#22c55e15', color: '#22c55e' }}>{p.faturamento_medio}</span>}
                        {p.como_achou && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#f59e0b15', color: '#f59e0b' }}>{p.como_achou}</span>}
                      </div>
                      {p.ultimo_contato && <div style={{ fontSize: 10, color: T.mt2, marginTop: 6 }}>Último contato: {new Date(p.ultimo_contato + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* New Prospect Modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 480, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Novo Prospect</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { k: 'name', l: 'Nome / Empresa', full: true },
                { k: 'tipo_negocio', l: 'Tipo de Negócio' },
                { k: 'faturamento_medio', l: 'Faturamento Médio' },
                { k: 'quanto_investe', l: 'Quanto Investe em Ads' },
                { k: 'whatsapp', l: 'WhatsApp' },
                { k: 'email', l: 'Email' },
                { k: 'instagram', l: 'Instagram' },
              ].map(f => (
                <div key={f.k} style={{ gridColumn: (f as any).full ? '1 / -1' : undefined }}>
                  <label style={labelS}>{f.l}</label>
                  <input value={(np as any)[f.k]} onChange={e => setNp({ ...np, [f.k]: e.target.value })} style={inputS} />
                </div>
              ))}
              <div>
                <label style={labelS}>Como me achou</label>
                <select value={np.como_achou} onChange={e => setNp({ ...np, como_achou: e.target.value })} style={inputS}>
                  <option value="" style={{ background: '#1a1a2e' }}>—</option>
                  {COMO_ACHOU.map(c => <option key={c} value={c} style={{ background: '#1a1a2e' }}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelS}>Temperatura</label>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Object.entries(TEMP).map(([k, v]) => (
                    <button key={k} onClick={() => setNp({ ...np, temperatura: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: np.temperatura === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: np.temperatura === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: np.temperatura === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelS}>Notas</label>
                <textarea value={np.notas} onChange={e => setNp({ ...np, notas: e.target.value })} rows={2} style={{ ...inputS, resize: 'vertical' as const }} placeholder="Observações sobre o prospect..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={addProspect} disabled={!np.name} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: np.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: np.name ? '#fff' : T.mt, cursor: np.name ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
