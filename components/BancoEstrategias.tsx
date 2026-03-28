'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME as T } from '@/lib/constants';

const btnS = (color: string, extra?: any) => ({
  background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10,
  padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra,
});
const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };

const CATS: any = {
  template: { label: 'Templates', icon: '📄', color: '#8b5cf6', desc: 'Estratégias por tipo de projeto' },
  checklist: { label: 'Checklists', icon: '✅', color: '#22c55e', desc: 'Processos passo a passo' },
  criativo: { label: 'Criativos', icon: '🎨', color: '#f59e0b', desc: 'Copys e headlines que funcionaram' },
  publico: { label: 'Públicos', icon: '👥', color: '#3b82f6', desc: 'Padrões de público (LAL, interesses)' },
  script: { label: 'Scripts', icon: '🎤', color: '#ef4444', desc: 'Scripts de reunião e vendas' },
  sop: { label: 'SOPs', icon: '📋', color: '#06b6d4', desc: 'Procedimentos operacionais' },
  anotacao: { label: 'Anotações', icon: '📝', color: '#a78bfa', desc: 'Notas gerais de estratégia' },
};

export default function BancoEstrategias({ user }: { user: any }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [ni, setNi] = useState({ title: '', category: 'anotacao', content: '', tags: '' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('strategies').select('*').order('updated_at', { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function addItem() {
    if (!ni.title) return;
    const { data } = await supabase.from('strategies').insert({ ...ni, user_id: user.id }).select().single();
    if (data) setItems([data, ...items]);
    setNi({ title: '', category: 'anotacao', content: '', tags: '' });
    setShowNew(false);
  }

  async function updateItem(id: string, updates: any) {
    await supabase.from('strategies').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setItems(items.map(i => i.id === id ? { ...i, ...updates } : i));
    if (selected?.id === id) setSelected({ ...selected, ...updates });
  }

  async function deleteItem(id: string) {
    await supabase.from('strategies').delete().eq('id', id);
    setItems(items.filter(i => i.id !== id));
    setSelected(null);
  }

  const filtered = items.filter(i => {
    if (filter !== 'all' && i.category !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.content || '').toLowerCase().includes(search.toLowerCase()) && !(i.tags || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt, fontSize: 15 }}>Carregando...</div>;

  // Detail view
  if (selected) {
    const cat = CATS[selected.category] || CATS.anotacao;

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setSelected(null); setEditing(false); }} style={btnS('#a78bfa')}>← Voltar</button>
          <button onClick={() => setEditing(!editing)} style={btnS('#3b82f6')}>{editing ? '👁️ Visualizar' : '✏️ Editar'}</button>
          <button onClick={() => { if (confirm('Excluir "' + selected.title + '"?')) deleteItem(selected.id); }} style={btnS('#ef4444', { marginLeft: 'auto' })}>🗑️</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: cat.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{cat.icon}</div>
          <div>
            {editing ? (
              <input value={selected.title} onChange={e => updateItem(selected.id, { title: e.target.value })} style={{ ...inputS, fontSize: 20, fontWeight: 800, padding: '6px 12px' }} />
            ) : (
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{selected.title}</h2>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 7, background: cat.color + '15', color: cat.color }}>{cat.icon} {cat.label}</span>
              <span style={{ fontSize: 12, color: T.mt }}>{new Date(selected.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelS}>Categoria</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(CATS).map(([k, v]: any) => (
                  <button key={k} onClick={() => updateItem(selected.id, { category: k })} style={{ padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selected.category === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: selected.category === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: selected.category === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelS}>Conteúdo</label>
              <textarea value={selected.content || ''} onChange={e => updateItem(selected.id, { content: e.target.value })} rows={15} style={{ ...inputS, resize: 'vertical' as const, fontSize: 14, lineHeight: '1.8', fontFamily: T.fn }} placeholder="Escreva o conteúdo aqui... Use quebras de linha para organizar." />
            </div>
            <div>
              <label style={labelS}>Tags (separadas por vírgula)</label>
              <input value={selected.tags || ''} onChange={e => updateItem(selected.id, { tags: e.target.value })} placeholder="Ex: lancamento, captacao, facebook" style={inputS} />
            </div>
            <div style={{ fontSize: 12, color: '#22c55e' }}>💾 Salvando automaticamente...</div>
          </div>
        ) : (
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 24 }}>
            {selected.tags && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
                {selected.tags.split(',').map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>#{t}</span>
                ))}
              </div>
            )}
            <div style={{ fontSize: 15, lineHeight: 1.9, whiteSpace: 'pre-wrap' as const, color: selected.content ? T.tx : T.mt }}>
              {selected.content || 'Sem conteúdo. Clique em "Editar" para adicionar.'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📚 Banco de Estratégias & Processos</h1>
        <button onClick={() => setShowNew(true)} style={btnS('#22c55e')}>+ Novo</button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === 'all' ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', border: filter === 'all' ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: filter === 'all' ? '#a5b4fc' : T.mt }}>Todos ({items.length})</button>
        {Object.entries(CATS).map(([k, v]: any) => {
          const cnt = items.filter(i => i.category === k).length;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: filter === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: filter === k ? v.color : T.mt }}>{v.icon} {v.label} ({cnt})</button>
          );
        })}
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar estratégia, processo, copy..." style={{ ...inputS, marginBottom: 18 }} />

      {/* Category summary cards */}
      {filter === 'all' && !search && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 20 }}>
          {Object.entries(CATS).map(([k, v]: any) => {
            const cnt = items.filter(i => i.category === k).length;
            return (
              <div key={k} onClick={() => setFilter(k)} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: v.color, opacity: 0.4 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18 }}>{v.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{v.label}</span>
                </div>
                <div style={{ fontSize: 12, color: T.mt, marginBottom: 6 }}>{v.desc}</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mo, color: v.color }}>{cnt}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Items list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: T.mt }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📚</div>
          <p style={{ fontSize: 15, marginBottom: 14 }}>{search ? 'Nenhum resultado para "' + search + '"' : 'Nenhuma estratégia cadastrada'}</p>
          <button onClick={() => setShowNew(true)} style={btnS('#6366f1')}>+ Criar primeira</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const cat = CATS[item.category] || CATS.anotacao;
            return (
              <div key={item.id} onClick={() => setSelected(item)} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: cat.color, opacity: 0.6 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{item.title}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: cat.color + '15', color: cat.color }}>{cat.label}</span>
                      {item.tags && item.tags.split(',').slice(0, 3).map((t: string) => t.trim()).filter(Boolean).map((t: string) => (
                        <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: T.mt }}>#{t}</span>
                      ))}
                      <span style={{ fontSize: 11, color: T.mt2, marginLeft: 'auto' }}>{new Date(item.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
                {item.content && <div style={{ fontSize: 13, color: T.mt, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: '100%' }}>{item.content.slice(0, 120)}...</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* New item modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Nova Estratégia / Processo</h2>

            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Título</label>
              <input value={ni.title} onChange={e => setNi({ ...ni, title: e.target.value })} placeholder="Ex: Checklist de Setup de Campanha Meta" style={inputS} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Categoria</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {Object.entries(CATS).map(([k, v]: any) => (
                  <button key={k} onClick={() => setNi({ ...ni, category: k })} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: ni.category === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: ni.category === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: ni.category === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelS}>Conteúdo</label>
              <textarea value={ni.content} onChange={e => setNi({ ...ni, content: e.target.value })} rows={8} placeholder="Escreva o conteúdo aqui..." style={{ ...inputS, resize: 'vertical' as const }} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelS}>Tags (separadas por vírgula)</label>
              <input value={ni.tags} onChange={e => setNi({ ...ni, tags: e.target.value })} placeholder="Ex: lancamento, captacao, meta" style={inputS} />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={addItem} disabled={!ni.title} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: ni.title ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: ni.title ? '#fff' : T.mt, cursor: ni.title ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
