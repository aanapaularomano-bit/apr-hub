'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SQUADS, THEME as T, fB } from '@/lib/constants';

const btnS = (color: string, extra?: any) => ({ background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10, padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra });
const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CURR_YEAR = new Date().getFullYear();
const CURR_MONTH = new Date().getMonth();

const PAY_ST: any = { pago: { l: 'Pago', c: '#22c55e' }, pendente: { l: 'Pendente', c: '#f59e0b' }, atrasado: { l: 'Atrasado', c: '#ef4444' } };
const EXP_CATS: any = { ferramenta: { l: 'Ferramentas', i: '🛠️', c: '#3b82f6' }, freelancer: { l: 'Freelancers', i: '👤', c: '#8b5cf6' }, infra: { l: 'Infra', i: '🖥️', c: '#06b6d4' }, fixo: { l: 'Fixo', i: '📋', c: '#f59e0b' } };
const PF_CATS: any = { alimentacao: { l: 'Alimentação', i: '🍽️', c: '#f59e0b' }, moradia: { l: 'Moradia', i: '🏠', c: '#8b5cf6' }, transporte: { l: 'Transporte', i: '🚗', c: '#3b82f6' }, saude: { l: 'Saúde', i: '💊', c: '#22c55e' }, lazer: { l: 'Lazer', i: '🎮', c: '#ef4444' }, educacao: { l: 'Educação', i: '📖', c: '#06b6d4' }, assinatura: { l: 'Assinaturas', i: '📱', c: '#a78bfa' }, outro: { l: 'Outro', i: '📋', c: '#64748b' } };
const INC_TYPES: any = { prolabore: { l: 'Pró-labore', c: '#22c55e' }, dividendo: { l: 'Dividendos', c: '#3b82f6' }, freelance: { l: 'Freelance', c: '#f59e0b' }, outro: { l: 'Outro', c: '#64748b' } };

export default function Financeiro({ clients, user }: { clients: any[], user: any }) {
  const [mainTab, setMainTab] = useState('pj');
  const [subTab, setSubTab] = useState('resumo');
  const [selMonth, setSelMonth] = useState(CURR_MONTH);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [pfExpenses, setPfExpenses] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [cardExpenses, setCardExpenses] = useState<any[]>([]);
  const [income, setIncome] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState('');
  const [form, setForm] = useState<any>({});

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [p, e, pf, cr, ce, inc, g] = await Promise.all([
      supabase.from('payments').select('*').eq('year', CURR_YEAR),
      supabase.from('expenses').select('*'),
      supabase.from('personal_expenses').select('*'),
      supabase.from('credit_cards').select('*'),
      supabase.from('card_expenses').select('*').eq('year', CURR_YEAR),
      supabase.from('personal_income').select('*').eq('year', CURR_YEAR),
      supabase.from('financial_goals').select('*'),
    ]);
    setPayments(p.data || []); setExpenses(e.data || []); setPfExpenses(pf.data || []);
    setCards(cr.data || []); setCardExpenses(ce.data || []); setIncome(inc.data || []); setGoals(g.data || []);
    setLoading(false);
  }

  // CRUD helpers
  async function add(table: string, data: any, setter: any, list: any[]) {
    const { data: d } = await supabase.from(table).insert({ ...data, ...(table !== 'card_expenses' ? { user_id: user.id } : {}) }).select().single();
    if (d) setter([d, ...list]);
    setShowModal(''); setForm({});
  }
  async function del(table: string, id: string, setter: any, list: any[]) {
    await supabase.from(table).delete().eq('id', id);
    setter(list.filter(i => i.id !== id));
  }
  async function upd(table: string, id: string, updates: any, setter: any, list: any[]) {
    await supabase.from(table).update(updates).eq('id', id);
    setter(list.map(i => i.id === id ? { ...i, ...updates } : i));
  }

  // PJ computed
  const mPays = (m: number) => payments.filter(p => p.month === m);
  const mRev = (m: number) => mPays(m).reduce((s, p) => s + (p.amount || 0), 0);
  const mPaid = (m: number) => mPays(m).filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0);
  const mPending = (m: number) => mPays(m).filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0);
  const mOverdue = (m: number) => mPays(m).filter(p => p.status === 'atrasado').reduce((s, p) => s + p.amount, 0);
  const totalPjExp = expenses.filter(e => e.recurrent).reduce((s, e) => s + (e.amount || 0), 0);
  const pjMargin = mRev(selMonth) - totalPjExp;

  // PF computed
  const totalPfExp = pfExpenses.filter(e => e.recurrent).reduce((s, e) => s + (e.amount || 0), 0);
  const mCardExp = cardExpenses.filter(c => c.month === selMonth).reduce((s, c) => s + (c.amount || 0), 0);
  const mIncome = income.filter(i => i.month === selMonth).reduce((s, i) => s + (i.amount || 0), 0);
  const pfBalance = mIncome - totalPfExp - mCardExp;

  const active = clients.filter(c => c.status === 'ativo');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt }}>Carregando financeiro...</div>;

  // Month selector
  const MonthBar = () => (
    <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
      {MONTHS.map((m, i) => (
        <button key={i} onClick={() => setSelMonth(i)} style={{ flex: 1, padding: '7px 2px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, border: 'none', background: selMonth === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)', color: selMonth === i ? '#a5b4fc' : i <= CURR_MONTH ? T.mt : T.mt2 }}>{m}</button>
      ))}
    </div>
  );

  // KPI card helper
  const KPI = ({ l, v, c, icon }: any) => (
    <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: c, opacity: 0.5 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{l}</span>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.mo, marginTop: 5, color: c }}>{v}</div>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>💰 Financeiro — {CURR_YEAR}</h1>
      </div>

      {/* Main tabs: PJ / PF / Fluxo */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {[['pj', '🏢 Agência (PJ)'], ['pf', '👤 Pessoal (PF)'], ['fluxo', '📊 Fluxo de Caixa'], ['metas', '🎯 Metas']].map(([k, l]) => (
          <button key={k} onClick={() => { setMainTab(k); setSubTab('resumo'); }} style={{ padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, background: mainTab === k ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: mainTab === k ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: mainTab === k ? '#a5b4fc' : T.mt }}>{l}</button>
        ))}
      </div>

      <MonthBar />

      {/* ═══ PJ — AGÊNCIA ═══ */}
      {mainTab === 'pj' && (<>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[['resumo', '📊 Resumo'], ['receita', '💰 Receita'], ['despesas', '📤 Despesas']].map(([k, l]) => (
            <button key={k} onClick={() => setSubTab(k)} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: subTab === k ? 'rgba(99,102,241,0.12)' : 'transparent', border: 'none', color: subTab === k ? '#a5b4fc' : T.mt, borderBottom: subTab === k ? '2px solid #a5b4fc' : '2px solid transparent' }}>{l}</button>
          ))}
        </div>

        {subTab === 'resumo' && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <KPI l="Receita" v={fB(mRev(selMonth))} c="#22c55e" icon="💰" />
            <KPI l="Despesas" v={fB(totalPjExp)} c="#ef4444" icon="📤" />
            <KPI l="Margem" v={fB(pjMargin)} c={pjMargin > 0 ? '#22c55e' : '#ef4444'} icon="📈" />
            <KPI l="Inadimplência" v={fB(mOverdue(selMonth))} c={mOverdue(selMonth) > 0 ? '#ef4444' : '#22c55e'} icon="🚨" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <KPI l="Recebido" v={fB(mPaid(selMonth))} c="#22c55e" icon="✅" />
            <KPI l="Pendente" v={fB(mPending(selMonth))} c="#f59e0b" icon="⏳" />
            <KPI l="Atrasado" v={fB(mOverdue(selMonth))} c="#ef4444" icon="🚨" />
          </div>
          {/* Bar chart */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Faturamento Mensal</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {MONTHS.map((m, i) => { const rev = mRev(i); const max = Math.max(...Array.from({ length: 12 }, (_, j) => mRev(j)), 1); const h = rev > 0 ? Math.max(8, (rev / max) * 100) : 4;
                return (<div key={i} onClick={() => setSelMonth(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}><span style={{ fontSize: 8, color: T.mt, fontFamily: T.mo }}>{rev > 0 ? fB(rev) : ''}</span><div style={{ width: '100%', height: h, borderRadius: 4, background: selMonth === i ? 'linear-gradient(180deg,#6366f1,#8b5cf6)' : i <= CURR_MONTH ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)' }} /><span style={{ fontSize: 9, color: selMonth === i ? '#a5b4fc' : T.mt, fontWeight: selMonth === i ? 700 : 400 }}>{m}</span></div>);
              })}
            </div>
          </div>
          {/* Fee por cliente */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Fee por Cliente</h3>
            {active.sort((a, b) => b.fee - a.fee).map(c => (<div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid ' + T.bdr }}><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 4, height: 20, borderRadius: 2, background: (SQUADS as any)[c.squad]?.color || '#a78bfa' }} /><span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span></div><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(c.fee)}/mês</span></div>))}
          </div>
        </div>)}

        {subTab === 'receita' && (<div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => { setForm({ client_id: '', amount: '', type: 'fee', status: 'pendente', note: '' }); setShowModal('payment'); }} style={btnS('#22c55e')}>+ Lançar Receita</button></div>
          {mPays(selMonth).length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: T.mt }}>Nenhum lançamento em {MONTHS[selMonth]}</div> :
            mPays(selMonth).map(p => { const cl = clients.find(c => c.id === p.client_id); const st = PAY_ST[p.status] || PAY_ST.pendente;
              return (<div key={p.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{cl?.name || '—'}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: p.type === 'fee' ? 'rgba(99,102,241,0.1)' : '#22c55e15', color: p.type === 'fee' ? '#a5b4fc' : '#22c55e' }}>{p.type === 'fee' ? 'Fee' : p.type === 'bonus' ? 'Bônus' : 'Projeto'}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(p.amount)}</span>
                <select value={p.status} onChange={e => upd('payments', p.id, { status: e.target.value }, setPayments, payments)} style={{ background: st.c + '15', border: '1px solid ' + st.c + '40', borderRadius: 6, padding: '3px 8px', color: st.c, fontSize: 11, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                  {Object.entries(PAY_ST).map(([k, v]: any) => <option key={k} value={k} style={{ background: '#1a1a2e' }}>{v.l}</option>)}
                </select>
                <button onClick={() => del('payments', p.id, setPayments, payments)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer' }}>✕</button>
              </div>); })}
        </div>)}

        {subTab === 'despesas' && (<div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => { setForm({ name: '', category: 'ferramenta', amount: '', recurrent: true, note: '' }); setShowModal('expense'); }} style={btnS('#ef4444')}>+ Despesa PJ</button></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 16 }}>
            {Object.entries(EXP_CATS).map(([k, v]: any) => { const t = expenses.filter(e => e.category === k).reduce((s, e) => s + (e.amount || 0), 0);
              return <KPI key={k} l={v.l} v={fB(t)} c={v.c} icon={v.i} />;
            })}
          </div>
          {expenses.map(e => { const cat = EXP_CATS[e.category] || EXP_CATS.fixo;
            return (<div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid ' + T.bdr }}><span style={{ fontSize: 16 }}>{cat.i}</span><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>{e.note && <div style={{ fontSize: 12, color: T.mt }}>{e.note}</div>}</div>{e.recurrent && <span style={{ fontSize: 10, color: T.mt }}>🔄</span>}<span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(e.amount)}</span><button onClick={() => del('expenses', e.id, setExpenses, expenses)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer' }}>✕</button></div>);
          })}
        </div>)}
      </>)}

      {/* ═══ PF — PESSOAL ═══ */}
      {mainTab === 'pf' && (<>
        <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
          {[['resumo', '📊 Resumo'], ['despesas_pf', '🍽️ Despesas'], ['cartoes', '💳 Cartões'], ['receita_pf', '💵 Receita']].map(([k, l]) => (
            <button key={k} onClick={() => setSubTab(k)} style={{ padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: subTab === k ? 'rgba(99,102,241,0.12)' : 'transparent', border: 'none', color: subTab === k ? '#a5b4fc' : T.mt, borderBottom: subTab === k ? '2px solid #a5b4fc' : '2px solid transparent' }}>{l}</button>
          ))}
        </div>

        {subTab === 'resumo' && (<div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <KPI l="Receita PF" v={fB(mIncome)} c="#22c55e" icon="💵" />
            <KPI l="Despesas Fixas" v={fB(totalPfExp)} c="#ef4444" icon="🏠" />
            <KPI l="Cartões" v={fB(mCardExp)} c="#8b5cf6" icon="💳" />
            <KPI l="Saldo" v={fB(pfBalance)} c={pfBalance > 0 ? '#22c55e' : '#ef4444'} icon="📊" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10 }}>
            {Object.entries(PF_CATS).map(([k, v]: any) => { const t = pfExpenses.filter(e => e.category === k).reduce((s, e) => s + (e.amount || 0), 0);
              return t > 0 ? <KPI key={k} l={v.l} v={fB(t)} c={v.c} icon={v.i} /> : null;
            })}
          </div>
        </div>)}

        {subTab === 'despesas_pf' && (<div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => { setForm({ name: '', category: 'alimentacao', amount: '', recurrent: true, due_day: '', note: '' }); setShowModal('pf_expense'); }} style={btnS('#ef4444')}>+ Despesa Pessoal</button></div>
          {pfExpenses.map(e => { const cat = PF_CATS[e.category] || PF_CATS.outro;
            return (<div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid ' + T.bdr }}><span style={{ fontSize: 16 }}>{cat.i}</span><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{e.name}</div>{e.note && <div style={{ fontSize: 12, color: T.mt }}>{e.note}</div>}</div>{e.due_day && <span style={{ fontSize: 11, color: T.mt }}>Dia {e.due_day}</span>}{e.recurrent && <span style={{ fontSize: 10, color: T.mt }}>🔄</span>}<span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(e.amount)}</span><button onClick={() => del('personal_expenses', e.id, setPfExpenses, pfExpenses)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer' }}>✕</button></div>);
          })}
          {pfExpenses.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: T.mt }}>Nenhuma despesa pessoal</div>}
        </div>)}

        {subTab === 'cartoes' && (<div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 14 }}>
            <button onClick={() => { setForm({ name: '', bandeira: 'Visa', limite: '', vencimento: '10' }); setShowModal('card'); }} style={btnS('#8b5cf6')}>+ Cartão</button>
            <button onClick={() => { setForm({ card_id: cards[0]?.id || '', description: '', amount: '', parcela: '' }); setShowModal('card_expense'); }} style={btnS('#ef4444')}>+ Lançamento</button>
          </div>
          {cards.map(card => {
            const cardExp = cardExpenses.filter(e => e.card_id === card.id && e.month === selMonth);
            const total = cardExp.reduce((s, e) => s + (e.amount || 0), 0);
            const pct = card.limite > 0 ? (total / card.limite * 100) : 0;
            return (<div key={card.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><div style={{ fontSize: 16, fontWeight: 700 }}>💳 {card.name}</div><div style={{ fontSize: 12, color: T.mt }}>{card.bandeira} · Vence dia {card.vencimento}</div></div>
                <div style={{ textAlign: 'right' as const }}><div style={{ fontSize: 12, color: T.mt }}>Fatura {MONTHS[selMonth]}</div><div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(total)}</div></div>
              </div>
              {card.limite > 0 && <div style={{ marginBottom: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mt, marginBottom: 3 }}><span>Utilizado: {pct.toFixed(0)}%</span><span>Limite: {fB(card.limite)}</span></div><div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}><div style={{ width: Math.min(pct, 100) + '%', height: '100%', borderRadius: 3, background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e' }} /></div></div>}
              {cardExp.map(e => (<div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid ' + T.bdr, fontSize: 13 }}><span>{e.description}{e.parcela && <span style={{ color: T.mt, fontSize: 11 }}> ({e.parcela})</span>}</span><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(e.amount)}</span><button onClick={() => del('card_expenses', e.id, setCardExpenses, cardExpenses)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 10 }}>✕</button></div></div>))}
              {cardExp.length === 0 && <div style={{ fontSize: 13, color: T.mt, textAlign: 'center', padding: 10 }}>Sem lançamentos</div>}
              <button onClick={() => del('credit_cards', card.id, setCards, cards)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 11, marginTop: 8 }}>🗑️ Excluir cartão</button>
            </div>);
          })}
          {cards.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: T.mt }}><div style={{ fontSize: 28, marginBottom: 8 }}>💳</div><p>Nenhum cartão cadastrado</p></div>}
        </div>)}

        {subTab === 'receita_pf' && (<div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => { setForm({ description: '', type: 'prolabore', amount: '' }); setShowModal('income'); }} style={btnS('#22c55e')}>+ Receita PF</button></div>
          {income.filter(i => i.month === selMonth).map(i => { const tp = INC_TYPES[i.type] || INC_TYPES.outro;
            return (<div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid ' + T.bdr }}><span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{i.description}</span><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: tp.c + '15', color: tp.c }}>{tp.l}</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(i.amount)}</span><button onClick={() => del('personal_income', i.id, setIncome, income)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer' }}>✕</button></div>);
          })}
          {income.filter(i => i.month === selMonth).length === 0 && <div style={{ textAlign: 'center', padding: 30, color: T.mt }}>Nenhuma receita em {MONTHS[selMonth]}</div>}
        </div>)}
      </>)}

      {/* ═══ FLUXO DE CAIXA ═══ */}
      {mainTab === 'fluxo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: '#22c55e' }}>📈 Entradas — {MONTHS[selMonth]}</h3>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid ' + T.bdr, padding: '6px 0' }}><span style={{ fontSize: 13 }}>Receita Agência (PJ)</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(mRev(selMonth))}</span></div>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid ' + T.bdr, padding: '6px 0' }}><span style={{ fontSize: 13 }}>Receita Pessoal (PF)</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(mIncome)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 15 }}><span>Total Entradas</span><span style={{ color: '#22c55e', fontFamily: T.mo }}>{fB(mRev(selMonth) + mIncome)}</span></div>
            </div>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: '#ef4444' }}>📉 Saídas — {MONTHS[selMonth]}</h3>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid ' + T.bdr, padding: '6px 0' }}><span style={{ fontSize: 13 }}>Despesas Agência (PJ)</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(totalPjExp)}</span></div>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid ' + T.bdr, padding: '6px 0' }}><span style={{ fontSize: 13 }}>Despesas Pessoais (PF)</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(totalPfExp)}</span></div>
              <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid ' + T.bdr, padding: '6px 0' }}><span style={{ fontSize: 13 }}>Cartões de Crédito</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(mCardExp)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 15 }}><span>Total Saídas</span><span style={{ color: '#ef4444', fontFamily: T.mo }}>{fB(totalPjExp + totalPfExp + mCardExp)}</span></div>
            </div>
          </div>
          {/* Balance */}
          {(() => { const balance = (mRev(selMonth) + mIncome) - (totalPjExp + totalPfExp + mCardExp);
            return <div style={{ background: balance > 0 ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)', border: '1px solid ' + (balance > 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'), borderRadius: 14, padding: '20px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 14, color: T.mt, marginBottom: 4 }}>Saldo do Mês — {MONTHS[selMonth]}</div>
              <div style={{ fontSize: 32, fontWeight: 800, fontFamily: T.mo, color: balance > 0 ? '#22c55e' : '#ef4444' }}>{fB(balance)}</div>
            </div>;
          })()}
        </div>
      )}

      {/* ═══ METAS ═══ */}
      {mainTab === 'metas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}><button onClick={() => { setForm({ title: '', target_amount: '', current_amount: '0', deadline: '' }); setShowModal('goal'); }} style={btnS('#8b5cf6')}>+ Nova Meta</button></div>
          {goals.map(g => { const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount * 100) : 0;
            return (<div key={g.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>🎯 {g.title}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: pct >= 100 ? '#22c55e' : '#a5b4fc' }}>{pct.toFixed(0)}%</div>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 10, overflow: 'hidden' }}><div style={{ width: Math.min(pct, 100) + '%', height: '100%', borderRadius: 4, background: pct >= 100 ? '#22c55e' : 'linear-gradient(90deg,#6366f1,#8b5cf6)' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.mt }}>
                <span>Atual: <b style={{ color: T.tx, fontFamily: T.mo }}>{fB(g.current_amount)}</b></span>
                <span>Meta: <b style={{ color: '#22c55e', fontFamily: T.mo }}>{fB(g.target_amount)}</b></span>
                {g.deadline && <span>Prazo: {new Date(g.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <input type="number" placeholder="Atualizar valor atual" onKeyDown={e => { if (e.key === 'Enter') { upd('financial_goals', g.id, { current_amount: Number((e.target as any).value) || 0 }, setGoals, goals); (e.target as any).value = ''; } }} style={{ ...inputS, flex: 1, fontSize: 13 }} />
                <button onClick={() => del('financial_goals', g.id, setGoals, goals)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 12 }}>🗑️</button>
              </div>
            </div>);
          })}
          {goals.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: T.mt }}><div style={{ fontSize: 32, marginBottom: 10 }}>🎯</div><p style={{ fontSize: 15 }}>Nenhuma meta financeira</p></div>}
        </div>
      )}

      {/* ═══ MODAIS ═══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal('')}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 28, width: 440, maxHeight: '80vh', overflowY: 'auto' }}>

            {showModal === 'payment' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>💰 Lançar Receita — {MONTHS[selMonth]}</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Cliente</label><select value={form.client_id || ''} onChange={e => setForm({ ...form, client_id: e.target.value })} style={inputS}><option value="">Selecionar...</option>{active.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor (R$)</label><input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Tipo</label><div style={{ display: 'flex', gap: 4 }}>{[['fee', 'Fee'], ['bonus', 'Bônus'], ['projeto', 'Projeto']].map(([k, l]) => <button key={k} onClick={() => setForm({ ...form, type: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.type === k ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: form.type === k ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: form.type === k ? '#a5b4fc' : T.mt }}>{l}</button>)}</div></div>
              <div style={{ marginBottom: 14 }}><label style={labelS}>Nota</label><input value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} style={inputS} /></div>
              <button onClick={() => add('payments', { ...form, amount: Number(form.amount), month: selMonth, year: CURR_YEAR }, setPayments, payments)} disabled={!form.client_id || !form.amount} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.client_id && form.amount ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Lançar</button>
            </>)}

            {showModal === 'expense' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>📤 Despesa Agência</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Nome</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor (R$)</label><input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Categoria</label><div style={{ display: 'flex', gap: 4 }}>{Object.entries(EXP_CATS).map(([k, v]: any) => <button key={k} onClick={() => setForm({ ...form, category: k })} style={{ flex: 1, padding: 7, borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: form.category === k ? v.c + '20' : 'rgba(255,255,255,0.03)', border: form.category === k ? '1px solid ' + v.c + '40' : '1px solid ' + T.bdr, color: form.category === k ? v.c : T.mt }}>{v.i} {v.l}</button>)}</div></div>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.recurrent !== false} onChange={e => setForm({ ...form, recurrent: e.target.checked })} /><label style={{ fontSize: 13, color: T.mt }}>Recorrente</label></div>
              <button onClick={() => add('expenses', { ...form, amount: Number(form.amount) }, setExpenses, expenses)} disabled={!form.name} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Adicionar</button>
            </>)}

            {showModal === 'pf_expense' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>🍽️ Despesa Pessoal</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Nome</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor (R$)</label><input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Categoria</label><div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>{Object.entries(PF_CATS).map(([k, v]: any) => <button key={k} onClick={() => setForm({ ...form, category: k })} style={{ padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: form.category === k ? v.c + '20' : 'rgba(255,255,255,0.03)', border: form.category === k ? '1px solid ' + v.c + '40' : '1px solid ' + T.bdr, color: form.category === k ? v.c : T.mt }}>{v.i} {v.l}</button>)}</div></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Dia vencimento</label><input type="number" value={form.due_day || ''} onChange={e => setForm({ ...form, due_day: e.target.value })} placeholder="Ex: 10" style={inputS} /></div>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={form.recurrent !== false} onChange={e => setForm({ ...form, recurrent: e.target.checked })} /><label style={{ fontSize: 13, color: T.mt }}>Recorrente</label></div>
              <button onClick={() => add('personal_expenses', { ...form, amount: Number(form.amount), due_day: Number(form.due_day) || null }, setPfExpenses, pfExpenses)} disabled={!form.name} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Adicionar</button>
            </>)}

            {showModal === 'card' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>💳 Novo Cartão</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Nome do cartão</label><input value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Nubank, Itaú..." style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Bandeira</label><div style={{ display: 'flex', gap: 4 }}>{['Visa', 'Mastercard', 'Elo', 'Amex'].map(b => <button key={b} onClick={() => setForm({ ...form, bandeira: b })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: form.bandeira === b ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: form.bandeira === b ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: form.bandeira === b ? '#a5b4fc' : T.mt }}>{b}</button>)}</div></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Limite (R$)</label><input type="number" value={form.limite || ''} onChange={e => setForm({ ...form, limite: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 14 }}><label style={labelS}>Dia vencimento</label><input type="number" value={form.vencimento || ''} onChange={e => setForm({ ...form, vencimento: e.target.value })} style={inputS} /></div>
              <button onClick={() => add('credit_cards', { ...form, limite: Number(form.limite), vencimento: Number(form.vencimento) }, setCards, cards)} disabled={!form.name} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Criar Cartão</button>
            </>)}

            {showModal === 'card_expense' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>💳 Lançamento no Cartão — {MONTHS[selMonth]}</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Cartão</label><select value={form.card_id || ''} onChange={e => setForm({ ...form, card_id: e.target.value })} style={inputS}>{cards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Descrição</label><input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor (R$)</label><input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 14 }}><label style={labelS}>Parcela (ex: 3/12)</label><input value={form.parcela || ''} onChange={e => setForm({ ...form, parcela: e.target.value })} placeholder="Opcional" style={inputS} /></div>
              <button onClick={() => add('card_expenses', { ...form, amount: Number(form.amount), month: selMonth, year: CURR_YEAR }, setCardExpenses, cardExpenses)} disabled={!form.description || !form.amount} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.description && form.amount ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Lançar</button>
            </>)}

            {showModal === 'income' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>💵 Receita Pessoal — {MONTHS[selMonth]}</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Descrição</label><input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor (R$)</label><input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 14 }}><label style={labelS}>Tipo</label><div style={{ display: 'flex', gap: 4 }}>{Object.entries(INC_TYPES).map(([k, v]: any) => <button key={k} onClick={() => setForm({ ...form, type: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, background: form.type === k ? v.c + '20' : 'rgba(255,255,255,0.03)', border: form.type === k ? '1px solid ' + v.c + '40' : '1px solid ' + T.bdr, color: form.type === k ? v.c : T.mt }}>{v.l}</button>)}</div></div>
              <button onClick={() => add('personal_income', { ...form, amount: Number(form.amount), month: selMonth, year: CURR_YEAR }, setIncome, income)} disabled={!form.description || !form.amount} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.description && form.amount ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Lançar</button>
            </>)}

            {showModal === 'goal' && (<>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 14px' }}>🎯 Nova Meta Financeira</h2>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Título</label><input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Reserva de emergência" style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor meta (R$)</label><input type="number" value={form.target_amount || ''} onChange={e => setForm({ ...form, target_amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelS}>Valor atual (R$)</label><input type="number" value={form.current_amount || ''} onChange={e => setForm({ ...form, current_amount: e.target.value })} style={inputS} /></div>
              <div style={{ marginBottom: 14 }}><label style={labelS}>Prazo</label><input type="date" value={form.deadline || ''} onChange={e => setForm({ ...form, deadline: e.target.value })} style={inputS} /></div>
              <button onClick={() => add('financial_goals', { ...form, target_amount: Number(form.target_amount), current_amount: Number(form.current_amount), deadline: form.deadline || null }, setGoals, goals)} disabled={!form.title} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: form.title ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>Criar Meta</button>
            </>)}
          </div>
        </div>
      )}
    </div>
  );
}
