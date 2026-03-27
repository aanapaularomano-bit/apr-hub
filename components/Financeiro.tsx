'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { SQUADS, THEME as T, fB, fN } from '@/lib/constants';

const btnS = (color: string, extra?: any) => ({
  background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10,
  padding: '8px 16px', color, cursor: 'pointer' as const, fontSize: 12, fontWeight: 600, ...extra,
});

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CURR_YEAR = new Date().getFullYear();
const CURR_MONTH = new Date().getMonth();

const PAY_STATUS: any = {
  pago: { label: 'Pago', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  atrasado: { label: 'Atrasado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const EXP_CATS: any = {
  ferramenta: { label: 'Ferramentas', icon: '🛠️', color: '#3b82f6' },
  freelancer: { label: 'Freelancers', icon: '👤', color: '#8b5cf6' },
  infra: { label: 'Infraestrutura', icon: '🖥️', color: '#06b6d4' },
  fixo: { label: 'Custos Fixos', icon: '📋', color: '#f59e0b' },
};

export default function Financeiro({ clients, user }: { clients: any[], user: any }) {
  const [tab, setTab] = useState('resumo');
  const [selMonth, setSelMonth] = useState(CURR_MONTH);
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [showNewPay, setShowNewPay] = useState(false);
  const [showNewExp, setShowNewExp] = useState(false);
  const [np, setNp] = useState({ client_id: '', amount: '', type: 'fee', status: 'pendente', note: '' });
  const [ne, setNe] = useState({ name: '', category: 'ferramenta', amount: '', recurrent: true, note: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFinancial(); }, []);

  async function loadFinancial() {
    setLoading(true);
    const [p, e] = await Promise.all([
      supabase.from('payments').select('*').eq('year', CURR_YEAR).order('created_at', { ascending: false }),
      supabase.from('expenses').select('*').order('created_at'),
    ]);
    setPayments(p.data || []);
    setExpenses(e.data || []);
    setLoading(false);
  }

  async function addPayment() {
    if (!np.client_id || !np.amount) return;
    const { data } = await supabase.from('payments').insert({
      client_id: np.client_id, month: selMonth, year: CURR_YEAR,
      amount: Number(np.amount), type: np.type, status: np.status, note: np.note,
    }).select().single();
    if (data) setPayments([data, ...payments]);
    setNp({ client_id: '', amount: '', type: 'fee', status: 'pendente', note: '' });
    setShowNewPay(false);
  }

  async function addExpense() {
    if (!ne.name) return;
    const { data } = await supabase.from('expenses').insert({
      name: ne.name, category: ne.category, amount: Number(ne.amount) || 0,
      recurrent: ne.recurrent, note: ne.note, user_id: user.id,
    }).select().single();
    if (data) setExpenses([...expenses, data]);
    setNe({ name: '', category: 'ferramenta', amount: '', recurrent: true, note: '' });
    setShowNewExp(false);
  }

  async function updatePaymentStatus(id: string, status: string) {
    await supabase.from('payments').update({ status }).eq('id', id);
    setPayments(payments.map(p => p.id === id ? { ...p, status } : p));
  }

  async function deletePayment(id: string) {
    await supabase.from('payments').delete().eq('id', id);
    setPayments(payments.filter(p => p.id !== id));
  }

  async function deleteExpense(id: string) {
    await supabase.from('expenses').delete().eq('id', id);
    setExpenses(expenses.filter(e => e.id !== id));
  }

  // Computed
  const monthPays = (m: number) => payments.filter(p => p.month === m);
  const monthRevenue = (m: number) => monthPays(m).reduce((s, p) => s + (p.amount || 0), 0);
  const monthPaid = (m: number) => monthPays(m).filter(p => p.status === 'pago').reduce((s, p) => s + p.amount, 0);
  const monthPending = (m: number) => monthPays(m).filter(p => p.status === 'pendente').reduce((s, p) => s + p.amount, 0);
  const monthOverdue = (m: number) => monthPays(m).filter(p => p.status === 'atrasado').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.filter(e => e.recurrent).reduce((s, e) => s + (e.amount || 0), 0);
  const oneTimeExpenses = expenses.filter(e => !e.recurrent).reduce((s, e) => s + (e.amount || 0), 0);
  const monthExp = totalExpenses + (selMonth === CURR_MONTH ? oneTimeExpenses : 0);

  const currRev = monthRevenue(selMonth);
  const currPaid = monthPaid(selMonth);
  const currPending = monthPending(selMonth);
  const currOverdue = monthOverdue(selMonth);
  const currMargin = currRev - monthExp;
  const marginPct = currRev > 0 ? ((currMargin / currRev) * 100).toFixed(1) : '0';

  const yearRevenue = Array.from({ length: 12 }, (_, i) => monthRevenue(i)).reduce((a, b) => a + b, 0);
  const yearMargin = yearRevenue - (totalExpenses * 12) - oneTimeExpenses;

  const active = clients.filter(c => c.status === 'ativo');

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt }}>Carregando financeiro...</div>;

  const tabs = [
    { id: 'resumo', l: '📊 Resumo' },
    { id: 'receita', l: '💰 Receita' },
    { id: 'despesas', l: '📤 Despesas' },
    { id: 'clientes', l: '👥 Por Cliente' },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💰 Financeiro — {CURR_YEAR}</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setShowNewPay(true)} style={btnS('#22c55e', { fontSize: 11 })}>+ Receita</button>
          <button onClick={() => setShowNewExp(true)} style={btnS('#ef4444', { fontSize: 11 })}>+ Despesa</button>
        </div>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
        {MONTHS.map((m, i) => (
          <button key={i} onClick={() => setSelMonth(i)} style={{
            flex: 1, padding: '7px 2px', borderRadius: 7, cursor: 'pointer', fontSize: 10, fontWeight: 600, border: 'none',
            background: selMonth === i ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
            color: selMonth === i ? '#a5b4fc' : i <= CURR_MONTH ? T.mt : T.mt2,
          }}>{m}</button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 1, marginBottom: 16, borderBottom: '1px solid ' + T.bdr }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none',
            padding: '7px 14px', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid #a5b4fc' : '2px solid transparent',
            color: tab === t.id ? T.tx : T.mt, fontSize: 11, fontWeight: 600,
          }}>{t.l}</button>
        ))}
      </div>

      {/* ═══ RESUMO ═══ */}
      {tab === 'resumo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {[
              { l: 'Receita Bruta', v: fB(currRev), c: '#22c55e', icon: '💰' },
              { l: 'Despesas', v: fB(monthExp), c: '#ef4444', icon: '📤' },
              { l: 'Margem Líquida', v: fB(currMargin), c: currMargin > 0 ? '#22c55e' : '#ef4444', icon: '📈' },
              { l: '% Margem', v: marginPct + '%', c: Number(marginPct) > 50 ? '#22c55e' : '#f59e0b', icon: '🎯' },
            ].map(k => (
              <div key={k.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.c, opacity: 0.5 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 600 }}>{k.l}</span>
                  <span style={{ fontSize: 14 }}>{k.icon}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.mo, marginTop: 6, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Payment status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              { l: 'Recebido', v: fB(currPaid), c: '#22c55e', icon: '✅' },
              { l: 'Pendente', v: fB(currPending), c: '#f59e0b', icon: '⏳' },
              { l: 'Atrasado', v: fB(currOverdue), c: '#ef4444', icon: '🚨' },
            ].map(k => (
              <div key={k.l} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span>{k.icon}</span>
                  <span style={{ fontSize: 11, color: T.mt, fontWeight: 600 }}>{k.l}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mo, color: k.c }}>{k.v}</div>
              </div>
            ))}
          </div>

          {/* Revenue chart */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 22 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>Faturamento Mensal — {CURR_YEAR}</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
              {MONTHS.map((m, i) => {
                const rev = monthRevenue(i);
                const maxRev = Math.max(...Array.from({ length: 12 }, (_, j) => monthRevenue(j)), 1);
                const h = rev > 0 ? Math.max(8, (rev / maxRev) * 120) : 4;
                const isSel = i === selMonth;
                return (
                  <div key={i} onClick={() => setSelMonth(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <span style={{ fontSize: 8, color: T.mt, fontFamily: T.mo }}>{rev > 0 ? fB(rev) : ''}</span>
                    <div style={{
                      width: '100%', height: h, borderRadius: 4,
                      background: isSel ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : i <= CURR_MONTH ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                    }} />
                    <span style={{ fontSize: 9, color: isSel ? '#a5b4fc' : T.mt, fontWeight: isSel ? 700 : 400 }}>{m}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Year summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>Receita Anual</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.mo, color: '#22c55e', marginTop: 4 }}>{fB(yearRevenue)}</div>
            </div>
            <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 10, color: T.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>Margem Anual</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: T.mo, color: yearMargin > 0 ? '#22c55e' : '#ef4444', marginTop: 4 }}>{fB(yearMargin)}</div>
            </div>
          </div>

          {/* Overdue alert */}
          {currOverdue > 0 && (
            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#fca5a5', marginBottom: 8 }}>🚨 Inadimplência — {MONTHS[selMonth]}</div>
              {monthPays(selMonth).filter(p => p.status === 'atrasado').map(p => {
                const cl = clients.find(c => c.id === p.client_id);
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{cl?.name || 'Cliente'}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: T.mo, color: '#ef4444' }}>{fB(p.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ RECEITA ═══ */}
      {tab === 'receita' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 12px' }}>Lançamentos — {MONTHS[selMonth]}</h3>
            {monthPays(selMonth).length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.mt }}>
                <p style={{ fontSize: 13, marginBottom: 12 }}>Nenhum lançamento em {MONTHS[selMonth]}</p>
                <button onClick={() => setShowNewPay(true)} style={btnS('#22c55e')}>+ Adicionar Receita</button>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'separate' as const, borderSpacing: '0 4px' }}>
                <thead>
                  <tr>
                    {['Cliente', 'Tipo', 'Valor', 'Status', 'Nota', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left' as const, padding: '6px 10px', fontSize: 9, fontWeight: 700, color: T.mt2, textTransform: 'uppercase' as const, borderBottom: '1px solid ' + T.bdr }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthPays(selMonth).map(p => {
                    const cl = clients.find(c => c.id === p.client_id);
                    const st = PAY_STATUS[p.status] || PAY_STATUS.pendente;
                    const sqColor = cl ? ((SQUADS as any)[cl.squad]?.color || '#a78bfa') : '#a78bfa';
                    return (
                      <tr key={p.id} style={{ background: 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600, borderRadius: '8px 0 0 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 4, height: 20, borderRadius: 2, background: sqColor }} />
                            {cl?.name || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: p.type === 'fee' ? 'rgba(99,102,241,0.1)' : p.type === 'bonus' ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)', color: p.type === 'fee' ? '#a5b4fc' : p.type === 'bonus' ? '#fcd34d' : '#86efac' }}>
                            {p.type === 'fee' ? 'Fee' : p.type === 'bonus' ? 'Bônus %' : 'Projeto'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 13, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(p.amount)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <select value={p.status} onChange={e => updatePaymentStatus(p.id, e.target.value)}
                            style={{ background: st.bg, border: '1px solid ' + st.color + '40', borderRadius: 6, padding: '3px 8px', color: st.color, fontSize: 10, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                            {Object.entries(PAY_STATUS).map(([k, v]: any) => <option key={k} value={k} style={{ background: '#1a1a2e' }}>{v.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '8px 10px', fontSize: 11, color: T.mt }}>{p.note || '—'}</td>
                        <td style={{ padding: '8px 10px', borderRadius: '0 8px 8px 0' }}>
                          <button onClick={() => deletePayment(p.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 10 }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ═══ DESPESAS ═══ */}
      {tab === 'despesas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* By category */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {Object.entries(EXP_CATS).map(([key, cat]: any) => {
              const total = expenses.filter(e => e.category === key).reduce((s, e) => s + (e.amount || 0), 0);
              return (
                <div key={key} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cat.color, opacity: 0.4 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>{cat.icon}</span>
                    <span style={{ fontSize: 10, color: T.mt, fontWeight: 600 }}>{cat.label}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mo, color: cat.color }}>{fB(total)}</div>
                </div>
              );
            })}
          </div>

          {/* List */}
          <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>Total mensal: <span style={{ color: '#ef4444', fontFamily: T.mo }}>{fB(totalExpenses)}/mês</span></div>
            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: T.mt }}>
                <p>Nenhuma despesa cadastrada</p>
                <button onClick={() => setShowNewExp(true)} style={btnS('#ef4444')}>+ Adicionar Despesa</button>
              </div>
            ) : expenses.map(e => {
              const cat = EXP_CATS[e.category] || EXP_CATS.fixo;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid ' + T.bdr }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{e.name}</div>
                    {e.note && <div style={{ fontSize: 10, color: T.mt }}>{e.note}</div>}
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: cat.color + '15', color: cat.color }}>{cat.label}</span>
                  {e.recurrent && <span style={{ fontSize: 8, color: T.mt }}>🔄</span>}
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mo, color: '#ef4444', minWidth: 80, textAlign: 'right' as const }}>{fB(e.amount)}</span>
                  <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 10 }}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ POR CLIENTE ═══ */}
      {tab === 'clientes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {active.sort((a, b) => b.fee - a.fee).map(c => {
            const clientPays = payments.filter(p => p.client_id === c.id);
            const yearTotal = clientPays.reduce((s, p) => s + (p.amount || 0), 0);
            const monthTotal = clientPays.filter(p => p.month === selMonth).reduce((s, p) => s + (p.amount || 0), 0);
            const hasOverdue = clientPays.some(p => p.status === 'atrasado');
            const sqColor = (SQUADS as any)[c.squad]?.color || '#a78bfa';

            return (
              <div key={c.id} style={{ background: T.card, border: '1px solid ' + (hasOverdue ? 'rgba(239,68,68,0.2)' : T.bdr), borderRadius: 14, padding: '16px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: sqColor, opacity: 0.4 }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: sqColor + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: sqColor }}>{c.name?.charAt(0)}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: sqColor + '15', color: sqColor }}>{fB(c.fee)}/mês</span>
                        {hasOverdue && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>⚠️ Atrasado</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const }}>
                    <div style={{ fontSize: 9, color: T.mt }}>Ano {CURR_YEAR}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mo, color: '#22c55e' }}>{fB(yearTotal)}</div>
                  </div>
                </div>

                {/* Mini monthly chart */}
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28, marginBottom: 6 }}>
                  {MONTHS.map((m, i) => {
                    const mTotal = clientPays.filter(p => p.month === i).reduce((s, p) => s + (p.amount || 0), 0);
                    const maxM = Math.max(...Array.from({ length: 12 }, (_, j) => clientPays.filter(p => p.month === j).reduce((s, p) => s + (p.amount || 0), 0)), 1);
                    const h = mTotal > 0 ? Math.max(4, (mTotal / maxM) * 24) : 2;
                    const hasOv = clientPays.some(p => p.month === i && p.status === 'atrasado');
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <div style={{ width: '100%', height: h, borderRadius: 2, background: hasOv ? '#ef4444' : i === selMonth ? '#6366f1' : sqColor + '55' }} />
                        <span style={{ fontSize: 6, color: T.mt2 }}>{m}</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: T.mt }}>
                  <span>{MONTHS[selMonth]}: <b style={{ color: T.tx, fontFamily: T.mo }}>{fB(monthTotal)}</b></span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL: New Payment ═══ */}
      {showNewPay && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewPay(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 26, width: 400 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>+ Lançamento de Receita — {MONTHS[selMonth]}</h2>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>CLIENTE</label>
              <select value={np.client_id} onChange={e => setNp({ ...np, client_id: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none' }}>
                <option value="" style={{ background: '#1a1a2e' }}>Selecionar...</option>
                {active.map(c => <option key={c.id} value={c.id} style={{ background: '#1a1a2e' }}>{c.name} ({fB(c.fee)}/mês)</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>VALOR (R$)</label>
              <input type="number" value={np.amount} onChange={e => setNp({ ...np, amount: e.target.value })} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 4 }}>TIPO</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[['fee', 'Fee'], ['bonus', 'Bônus %'], ['projeto', 'Projeto']].map(([k, l]) => (
                  <button key={k} onClick={() => setNp({ ...np, type: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: np.type === k ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: np.type === k ? '1px solid rgba(99,102,241,0.3)' : '1px solid ' + T.bdr, color: np.type === k ? '#a5b4fc' : T.mt }}>{l}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 4 }}>STATUS</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {Object.entries(PAY_STATUS).map(([k, v]: any) => (
                  <button key={k} onClick={() => setNp({ ...np, status: k })} style={{ flex: 1, padding: 8, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: np.status === k ? v.bg : 'rgba(255,255,255,0.03)', border: np.status === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: np.status === k ? v.color : T.mt }}>{v.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2 }}>NOTA (opcional)</label>
              <input value={np.note} onChange={e => setNp({ ...np, note: e.target.value })} placeholder="Ex: Bônus 2% sobre R$189K" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewPay(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={addPayment} disabled={!np.client_id || !np.amount} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: np.client_id && np.amount ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: np.client_id && np.amount ? '#fff' : T.mt, cursor: np.client_id && np.amount ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Lançar</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODAL: New Expense ═══ */}
      {showNewExp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowNewExp(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#12121e', border: '1px solid ' + T.bdr, borderRadius: 16, padding: 26, width: 400 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 14px' }}>+ Nova Despesa</h2>

            {[{ k: 'name', l: 'Nome', p: 'Ex: Supermetrics' }, { k: 'amount', l: 'Valor (R$)', t: 'number' }, { k: 'note', l: 'Observação' }].map((f: any) => (
              <div key={f.k} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 2, textTransform: 'uppercase' as const }}>{f.l}</label>
                <input type={f.t || 'text'} value={(ne as any)[f.k] || ''} onChange={e => setNe({ ...ne, [f.k]: e.target.value })} placeholder={f.p || ''} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + T.bdr, borderRadius: 10, padding: '9px 14px', color: T.tx, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }} />
              </div>
            ))}

            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 600, color: T.mt2, display: 'block', marginBottom: 4, textTransform: 'uppercase' as const }}>CATEGORIA</label>
              <div style={{ display: 'flex', gap: 3 }}>
                {Object.entries(EXP_CATS).map(([k, v]: any) => (
                  <button key={k} onClick={() => setNe({ ...ne, category: k })} style={{ flex: 1, padding: 7, borderRadius: 7, cursor: 'pointer', fontSize: 9, fontWeight: 600, background: ne.category === k ? v.color + '20' : 'rgba(255,255,255,0.03)', border: ne.category === k ? '1px solid ' + v.color + '40' : '1px solid ' + T.bdr, color: ne.category === k ? v.color : T.mt }}>{v.icon} {v.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={ne.recurrent} onChange={e => setNe({ ...ne, recurrent: e.target.checked })} style={{ accentColor: '#6366f1' }} />
              <label style={{ fontSize: 11, color: T.mt }}>Recorrente (mensal)</label>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewExp(false)} style={{ flex: 1, padding: 9, borderRadius: 9, border: '1px solid ' + T.bdr, background: 'transparent', color: T.mt, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={addExpense} disabled={!ne.name} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', background: ne.name ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.05)', color: ne.name ? '#fff' : T.mt, cursor: ne.name ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
