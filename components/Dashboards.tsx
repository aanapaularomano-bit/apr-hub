'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME as T } from '@/lib/constants';

const btnS = (color: string, extra?: any) => ({ background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10, padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra });
const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };

export default function Dashboards({ clients, user }: { clients: any[], user: any }) {
  const [dashes, setDashes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editDash, setEditDash] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('client_dashboards').select('*').order('created_at', { ascending: false });
    setDashes(data || []);
    setLoading(false);
  }

  async function createDash() {
    const code = 'd' + Date.now().toString(36);
    const { data } = await supabase.from('client_dashboards').insert({ ...form, dash_code: code, template: 'simple', user_id: user.id, daily_data: [], ads_data: [] }).select().single();
    if (data) { setDashes([data, ...dashes]); setEditDash(data); }
    setShowNew(false); setForm({});
  }

  async function saveDash() {
    if (!editDash) return;
    const { id, created_at, ...updates } = editDash;
    await supabase.from('client_dashboards').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id);
    setDashes(dashes.map(d => d.id === id ? editDash : d));
  }

  async function deleteDash(id: string) {
    await supabase.from('client_dashboards').delete().eq('id', id);
    setDashes(dashes.filter(d => d.id !== id));
    setEditDash(null);
  }

  // Edit view
  if (editDash) {
    const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/dash/' + editDash.dash_code;
    const upd = (k: string, v: any) => setEditDash({ ...editDash, [k]: v });
    const numUpd = (k: string, v: string) => upd(k, Number(v) || 0);

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => { saveDash(); setEditDash(null); }} style={btnS('#a78bfa')}>← Salvar & Voltar</button>
          <button onClick={() => saveDash()} style={btnS('#22c55e')}>💾 Salvar</button>
          <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...btnS('#3b82f6'), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>👁️ Visualizar</a>
          <button onClick={() => { navigator.clipboard.writeText(link); }} style={btnS('#6366f1')}>📋 Copiar Link</button>
          <button onClick={() => { if (confirm('Excluir?')) deleteDash(editDash.id); }} style={btnS('#ef4444', { marginLeft: 'auto' })}>🗑️</button>
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 18 }}>📊 Editar Dashboard</h2>

        {/* Link */}
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: T.mt }}>Link público:</span>
          <input value={link} readOnly style={{ flex: 1, background: 'transparent', border: 'none', color: '#a5b4fc', fontSize: 13, fontFamily: T.mo, outline: 'none' }} />
        </div>

        {/* Basic info */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Informações Básicas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={labelS}>Título</label><input value={editDash.title || ''} onChange={e => upd('title', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Cliente</label><select value={editDash.client_id || ''} onChange={e => upd('client_id', e.target.value)} style={inputS}><option value="">—</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label style={labelS}>Data Início</label><input type="date" value={editDash.date_start || ''} onChange={e => upd('date_start', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Data Fim</label><input type="date" value={editDash.date_end || ''} onChange={e => upd('date_end', e.target.value)} style={inputS} /></div>
            <div><label style={labelS}>Tema</label><div style={{ display: 'flex', gap: 4 }}>{['dark', 'light'].map(t => <button key={t} onClick={() => upd('theme', t)} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: editDash.theme === t ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: editDash.theme === t ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: editDash.theme === t ? '#a5b4fc' : T.mt }}>{t === 'dark' ? '🌙 Dark' : '☀️ Light'}</button>)}</div></div>
          </div>
        </div>

        {/* Budget */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💰 Orçamento por Etapa</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['budget_total', 'Total'], ['budget_captacao', 'Captação'], ['budget_aquecimento', 'Aquecimento'], ['budget_lembrete', 'Lembrete'], ['budget_cpls', 'CPLs'], ['budget_carrinho', 'Carrinho']].map(([k, l]) => (
              <div key={k}><label style={labelS}>{l}</label><input type="number" value={editDash[k] || ''} onChange={e => numUpd(k, e.target.value)} style={inputS} /></div>
            ))}
          </div>
        </div>

        {/* Captação */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📊 Captação</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['leads_total', 'Leads Total'], ['cpl', 'CPL (R$)'], ['investimento', 'Investimento'], ['leads_confirmados', 'Confirmados'], ['taxa_confirmacao', 'Taxa Confirm. %'], ['leads_quentes', 'Quentes'], ['leads_frios', 'Frios'], ['leads_whatsapp', 'WhatsApp'], ['grupos_whatsapp', 'Grupos WPP'], ['taxa_aderencia', 'Aderência %']].map(([k, l]) => (
              <div key={k}><label style={labelS}>{l}</label><input type="number" value={editDash[k] || ''} onChange={e => numUpd(k, e.target.value)} style={inputS} /></div>
            ))}
          </div>
        </div>

        {/* Meta Ads */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📘 Meta Ads</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['impressions', 'Impressões'], ['alcance', 'Alcance'], ['cliques', 'Cliques'], ['page_views', 'Page Views'], ['ctr', 'CTR %'], ['cpc', 'CPC (R$)'], ['cpm', 'CPM (R$)'], ['tx_carregamento', 'Tx Carreg. %'], ['tx_conversao', 'Tx Conv. %']].map(([k, l]) => (
              <div key={k}><label style={labelS}>{l}</label><input type="number" value={editDash[k] || ''} onChange={e => numUpd(k, e.target.value)} style={inputS} /></div>
            ))}
          </div>
        </div>

        {/* Vendas */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>💰 Vendas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[['faturamento', 'Faturamento'], ['lucro', 'Lucro'], ['vendas_total', 'Vendas'], ['taxa_lista', 'Taxa Lista %'], ['cac', 'CAC (R$)'], ['roas', 'ROAS']].map(([k, l]) => (
              <div key={k}><label style={labelS}>{l}</label><input type="number" value={editDash[k] || ''} onChange={e => numUpd(k, e.target.value)} style={inputS} /></div>
            ))}
          </div>
        </div>

        {/* Daily data */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📅 Dados Diários (JSON)</h3>
          <p style={{ fontSize: 12, color: T.mt, marginBottom: 8 }}>Formato: [{"{"}"date":"27/03","leads":41,"cpl":12.24,"investimento":501.94{"}"}, ...]</p>
          <textarea value={JSON.stringify(editDash.daily_data || [], null, 2)} onChange={e => { try { upd('daily_data', JSON.parse(e.target.value)); } catch {} }} rows={6} style={{ ...inputS, fontFamily: T.mo, fontSize: 12, resize: 'vertical' as const }} />
        </div>

        {/* Ads data */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22, marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📢 Dados dos Anúncios (JSON)</h3>
          <p style={{ fontSize: 12, color: T.mt, marginBottom: 8 }}>Formato: [{"{"}"name":"AD01","investimento":176,"leads":24,"cpl":7.34,"ctr":0.82,"cpm":15{"}"}, ...]</p>
          <textarea value={JSON.stringify(editDash.ads_data || [], null, 2)} onChange={e => { try { upd('ads_data', JSON.parse(e.target.value)); } catch {} }} rows={6} style={{ ...inputS, fontFamily: T.mo, fontSize: 12, resize: 'vertical' as const }} />
        </div>

        {/* Resumo */}
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>📋 Resumo Executivo</h3>
          <textarea value={editDash.resumo || ''} onChange={e => upd('resumo', e.target.value)} rows={4} placeholder="Análise geral do período, destaques, próximos passos..." style={{ ...inputS, resize: 'vertical' as const }} />
        </div>
      </div>
    );
  }

  // List view
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>📊 Dashboards de Clientes</h1>
        <button onClick={() => { setForm({ title: '', client_id: '', theme: 'dark' }); setShowNew(true); }} style={btnS('#22c55e')}>+ Novo Dashboard</button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: T.mt }}>Carregando...</div> :
        dashes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.mt }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📊</div>
            <p style={{ fontSize: 16, marginBottom: 16 }}>Nenhum dashboard criado ainda</p>
            <p style={{ fontSize: 13, color: T.mt2, marginBottom: 20 }}>Crie dashboards personalizados para seus clientes com link público.</p>
            <button onClick={() => { setForm({ title: '', client_id: '', theme: 'dark' }); setShowNew(true); }} style={btnS('#6366f1')}>Criar primeiro dashboard</button>
          </div>
        ) : dashes.map(d => {
          const cl = clients.find((c: any) => c.id === d.client_id);
          const link = (typeof window !== 'undefined' ? window.location.origin : '') + '/dash/' + d.dash_code;
          return (
            <div key={d.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: '16px 20px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{d.title}</div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                  {cl && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>{cl.name}</span>}
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.05)', color: T.mt }}>{d.theme === 'dark' ? '🌙' : '☀️'} {d.template}</span>
                  {d.leads_total > 0 && <span style={{ fontSize: 11, color: T.mt }}>{d.leads_total} leads</span>}
                </div>
              </div>
              <button onClick={() => setEditDash(d)} style={btnS('#3b82f6', { fontSize: 12, padding: '8px 14px' })}>✏️ Editar</button>
              <a href={link} target="_blank" rel="noopener noreferrer" style={{ ...btnS('#22c55e'), fontSize: 12, padding: '8px 14px', textDecoration: 'none' }}>👁️</a>
              <button onClick={() => { navigator.clipboard.writeText(link); }} style={btnS('#6366f1', { fontSize: 12, padding: '8px 14px' })}>📋</button>
            </div>
          );
        })
      }

      {/* New dashboard modal */}
      {showNew && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNew(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 440 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 16px' }}>+ Novo Dashboard</h2>
            <div style={{ marginBottom: 12 }}><label style={labelS}>Título</label><input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Captação Lançamento Maio" style={inputS} /></div>
            <div style={{ marginBottom: 12 }}><label style={labelS}>Cliente</label><select value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value })} style={inputS}><option value="">Selecionar...</option>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div style={{ marginBottom: 16 }}><label style={labelS}>Tema</label><div style={{ display: 'flex', gap: 4 }}>{['dark', 'light'].map(t => <button key={t} onClick={() => setForm({ ...form, theme: t })} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.theme === t ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: form.theme === t ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: form.theme === t ? '#a5b4fc' : T.mt }}>{t === 'dark' ? '🌙 Dark' : '☀️ Light'}</button>)}</div></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 14 }}>Cancelar</button>
              <button onClick={createDash} disabled={!form.title} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: form.title ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: form.title ? '#fff' : T.mt, cursor: form.title ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
