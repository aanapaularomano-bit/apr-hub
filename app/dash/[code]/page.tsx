'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

const fB = (n: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fN = (n: number) => (n || 0).toLocaleString('pt-BR');
const fP = (n: number) => (n || 0).toFixed(2) + '%';

export default function DashPage() {
  const params = useParams();
  const code = params?.code as string;
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('captacao');

  useEffect(() => { if (code) load(); }, [code]);
  async function load() {
    const { data } = await supabase.from('client_dashboards').select('*').eq('dash_code', code).single();
    setDash(data); setLoading(false);
  }

  if (loading) return (<div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18, color: '#b8977e' }}>Carregando...</span></div>);
  if (!dash) return (<div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>😕</div><h1 style={{ fontSize: 22 }}>Dashboard não encontrado</h1></div></div>);

  const isDark = dash.theme === 'dark';
  const P = isDark
    ? { bg: '#0c1322', card: '#141e33', bdr: '#1e2d4a', tx: '#e8edf5', mt: '#7b8ba8', mt2: '#4a5a75', accent: '#5b8def', headerBg: 'linear-gradient(135deg,#1a2844,#243556)', budgetBg: '#1a2844', kpiBg: '#141e33' }
    : { bg: '#faf9f7', card: '#ffffff', bdr: '#e8e0d8', tx: '#2d2a26', mt: '#8a7f72', mt2: '#b8ad9f', accent: '#b8977e', headerBg: 'linear-gradient(135deg,#b8977e,#d4a88c)', budgetBg: '#f1ebe4', kpiBg: '#fff' };

  const daily = dash.daily_data || [];
  const ads = dash.ads_data || [];
  const maxLeads = Math.max(...daily.map((d: any) => d.leads || 0), 1);

  const KPI = ({ l, v, sub, sm }: any) => (
    <div style={{ background: P.kpiBg, border: '1px solid ' + P.bdr, borderRadius: 10, padding: sm ? '12px 16px' : '16px 20px', textAlign: 'center' as const }}>
      <div style={{ fontSize: 11, color: P.mt, textTransform: 'uppercase' as const, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
      <div style={{ fontSize: sm ? 20 : 28, fontWeight: 700, color: P.tx }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: P.mt, marginTop: 3 }}>{sub}</div>}
    </div>
  );

  const budgets = [
    { l: 'Captação', pv: dash.budget_captacao || 0 },
    { l: 'Aquecimento', pv: dash.budget_aquecimento || 0 },
    { l: 'Lembrete', pv: dash.budget_lembrete || 0 },
    { l: 'CPLs', pv: dash.budget_cpls || 0 },
    { l: 'Carrinho', pv: dash.budget_carrinho || 0 },
  ];
  const hasBudget = budgets.some(b => b.pv > 0);

  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.tx, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <div style={{ background: P.headerBg, padding: '24px 0', color: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {dash.logo_url && <img src={dash.logo_url} alt="" style={{ height: 48, marginBottom: 8 }} />}
            <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{dash.title}</h1>
          </div>
          <div style={{ textAlign: 'right' as const, fontSize: 13, opacity: 0.85 }}>
            {dash.date_start && <div>{new Date(dash.date_start + 'T12:00:00').toLocaleDateString('pt-BR')} — {dash.date_end ? new Date(dash.date_end + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</div>}
          </div>
        </div>
      </div>

      {/* BUDGET BAR */}
      {hasBudget && (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'flex' }}>
            <div style={{ background: P.accent, padding: '14px 20px', textAlign: 'center' as const, color: '#fff', minWidth: 150 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, opacity: 0.8 }}>Orçamento Total</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>Previsto: {fB(dash.budget_total)}</div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{fB(dash.investimento)}</div>
            </div>
            {budgets.filter(b => b.pv > 0).map(b => (
              <div key={b.l} style={{ flex: 1, background: P.budgetBg, padding: '14px 12px', textAlign: 'center' as const, borderRight: '1px solid ' + P.bdr }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: P.mt, textTransform: 'uppercase' as const }}>{b.l}</div>
                <div style={{ fontSize: 10, color: P.mt2 }}>Previsto: {fB(b.pv)}</div>
                <div style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{fB(b.pv)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 32px 60px' }}>
        {/* TABS */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '2px solid ' + P.bdr }}>
          {[['captacao', 'Captação'], ['vendas', 'Vendas / Remarketing']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '12px 28px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, fontWeight: 700, color: tab === k ? P.accent : P.mt, borderBottom: tab === k ? '3px solid ' + P.accent : '3px solid transparent', fontFamily: "'Cormorant Garamond', Georgia, serif" }}>{l}</button>
          ))}
        </div>

        {/* CAPTAÇÃO */}
        {tab === 'captacao' && (<div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: P.mt }}>Resultados da captação no Meta Ads</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <KPI l="Action Leads" v={fN(dash.leads_total)} />
                <KPI l="CPA no Tráfego" v={fB(dash.cpl)} />
                <KPI l="Investimento" v={fB(dash.investimento)} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: P.mt }}>Resultados da captação na planilha</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <KPI l="Leads Gerais" v={fN(dash.leads_confirmados || dash.leads_total)} />
                <KPI l="CPA" v={fB(dash.cpl)} />
                <KPI l="Investimento" v={fB(dash.investimento)} />
              </div>
            </div>
          </div>

          {daily.length > 0 && (
            <div style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ background: P.accent, color: '#fff', padding: '10px 18px', borderRadius: 8, textAlign: 'center' as const, fontSize: 15, fontWeight: 700, marginBottom: 18, fontFamily: "'Cormorant Garamond', serif" }}>Dados da captação por dia</div>
              <div style={{ display: 'flex', gap: 4, fontSize: 12, color: P.mt, marginBottom: 14 }}><span>■ Leads</span><span style={{ marginLeft: 12 }}>● CPL</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 200 }}>
                {daily.map((d: any, i: number) => {
                  const h = d.leads > 0 ? Math.max(16, (d.leads / maxLeads) * 160) : 6;
                  return (<div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{ fontSize: 9, color: P.mt, fontWeight: 600 }}>{d.cpl > 0 ? fB(d.cpl) : ''}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: P.tx }}>{d.leads > 0 ? d.leads : ''}</div>
                    <div style={{ width: '75%', height: h, borderRadius: 4, background: P.accent, opacity: 0.75 }} />
                    <div style={{ fontSize: 8, color: P.mt, textAlign: 'center' as const, maxWidth: 50, overflow: 'hidden', whiteSpace: 'nowrap' as const }}>{d.date || ''}</div>
                  </div>);
                })}
              </div>
            </div>
          )}

          {(dash.leads_quentes > 0 || dash.leads_frios > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[{ l: 'Público Quente', v: dash.leads_quentes, pct: dash.leads_total > 0 ? ((dash.leads_quentes / dash.leads_total) * 100) : 0 },
                { l: 'Público Frio', v: dash.leads_frios, pct: dash.leads_total > 0 ? ((dash.leads_frios / dash.leads_total) * 100) : 0 }
              ].map(p => (
                <div key={p.l} style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, padding: '20px 24px', textAlign: 'center' as const }}>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, fontFamily: "'Cormorant Garamond', serif" }}>{p.l}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 30 }}>
                    <div><div style={{ fontSize: 11, color: P.mt }}>Total</div><div style={{ fontSize: 28, fontWeight: 800 }}>{fN(p.v)}</div></div>
                    <div><div style={{ fontSize: 11, color: P.mt }}>%</div><div style={{ fontSize: 28, fontWeight: 800 }}>{p.pct.toFixed(2)}%</div></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {dash.impressions > 0 && (
            <div style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 700, textAlign: 'center' as const, marginBottom: 18, fontFamily: "'Cormorant Garamond', serif" }}>Métricas Principais de Captação de Leads de Tráfego Pago</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
                {[
                  { l: 'Impressões', v: fN(dash.impressions), below: 'CPM', belowV: fB(dash.cpm) },
                  { rate: fP(dash.ctr), rateL: 'CTR' },
                  { l: 'Cliques', v: fN(dash.cliques), below: 'CPC', belowV: fB(dash.cpc) },
                  { rate: fP(dash.tx_carregamento), rateL: 'Tx Carreg.' },
                  { l: 'Page View', v: fN(dash.page_views) },
                  { rate: fP(dash.tx_conversao), rateL: 'Tx Conv.' },
                  { l: 'Leads', v: fN(dash.leads_total), below: 'CPL', belowV: fB(dash.cpl) },
                ].map((item, i) => (
                  'rate' in item ? (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 6px' }}>
                      <div style={{ fontSize: 10, color: P.mt, fontWeight: 600 }}>{item.rateL}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: P.accent }}>{item.rate}</div>
                      <div style={{ fontSize: 18, color: P.mt }}>→</div>
                    </div>
                  ) : (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ border: '1px solid ' + P.bdr, borderRadius: 10, padding: '12px 18px', textAlign: 'center' as const, minWidth: 100 }}>
                        <div style={{ fontSize: 10, color: P.mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{(item as any).l}</div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{(item as any).v}</div>
                      </div>
                      {(item as any).below && <><div style={{ marginTop: 4, fontSize: 10, color: P.mt }}>↓</div><div style={{ border: '1px solid ' + P.bdr, borderRadius: 8, padding: '8px 14px', textAlign: 'center' as const, marginTop: 2 }}><div style={{ fontSize: 10, color: P.mt, fontWeight: 600 }}>{(item as any).below}</div><div style={{ fontSize: 16, fontWeight: 800 }}>{(item as any).belowV}</div></div></>}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {daily.length > 0 && (
            <div style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: isDark ? '#1a2844' : '#f5f0ea' }}>
                  {['Data', 'Investimento', 'Action Leads', 'CPA'].map(h => <th key={h} style={{ padding: '10px 14px', textAlign: 'left' as const, fontWeight: 700, fontSize: 12, color: P.mt, borderBottom: '2px solid ' + P.bdr }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {daily.map((d: any, i: number) => (<tr key={i} style={{ borderBottom: '1px solid ' + P.bdr }}>
                    <td style={{ padding: '8px 14px' }}>{d.date}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{fB(d.investimento || 0)}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{d.leads || 0}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600, color: P.accent }}>{fB(d.cpl || 0)}</td>
                  </tr>))}
                  <tr style={{ fontWeight: 800, background: isDark ? '#1a2844' : '#f5f0ea' }}>
                    <td style={{ padding: '10px 14px' }}>Total geral</td>
                    <td style={{ padding: '10px 14px' }}>{fB(daily.reduce((s: number, d: any) => s + (d.investimento || 0), 0))}</td>
                    <td style={{ padding: '10px 14px' }}>{daily.reduce((s: number, d: any) => s + (d.leads || 0), 0)}</td>
                    <td style={{ padding: '10px 14px', color: P.accent }}>{fB(dash.cpl)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>)}

        {/* VENDAS */}
        {tab === 'vendas' && (<div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, fontFamily: "'Cormorant Garamond', serif" }}>Remarketing</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            <KPI l="Faturamento Total" v={fB(dash.faturamento)} />
            <KPI l="Lucro" v={fB(dash.lucro)} />
            <KPI l="Vendas Concluídas" v={fN(dash.vendas_total)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            <KPI l="Taxa Lista" v={fP(dash.taxa_lista)} sm />
            <KPI l="CAC" v={fB(dash.cac)} sm />
            <KPI l="ROAS" v={(dash.roas || 0).toFixed(2)} sm />
          </div>

          {ads.length > 0 && (
            <div style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ background: isDark ? '#1a2844' : P.accent, color: '#fff', padding: '10px 18px', fontSize: 15, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>Dados dos Anúncios</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: isDark ? '#141e33' : '#f5f0ea' }}>
                  {['Anúncio', 'Investimento', 'Action Leads', 'Custo por lead', 'CTR', 'CPM'].map(h => <th key={h} style={{ padding: '10px 12px', textAlign: 'left' as const, fontWeight: 700, fontSize: 11, color: P.mt, borderBottom: '2px solid ' + P.bdr }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {ads.map((a: any, i: number) => (<tr key={i} style={{ borderBottom: '1px solid ' + P.bdr }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{a.name}</td>
                    <td style={{ padding: '8px 12px' }}>{fB(a.investimento || 0)}</td>
                    <td style={{ padding: '8px 12px' }}>{a.leads || 0}</td>
                    <td style={{ padding: '8px 12px', color: P.accent, fontWeight: 600 }}>{fB(a.cpl || 0)}</td>
                    <td style={{ padding: '8px 12px' }}>{fP(a.ctr || 0)}</td>
                    <td style={{ padding: '8px 12px' }}>{fB(a.cpm || 0)}</td>
                  </tr>))}
                  <tr style={{ fontWeight: 800, background: isDark ? '#1a2844' : '#f5f0ea' }}>
                    <td style={{ padding: '10px 12px' }}>Total geral</td>
                    <td style={{ padding: '10px 12px' }}>{fB(ads.reduce((s: number, a: any) => s + (a.investimento || 0), 0))}</td>
                    <td style={{ padding: '10px 12px' }}>{ads.reduce((s: number, a: any) => s + (a.leads || 0), 0)}</td>
                    <td style={{ padding: '10px 12px', color: P.accent }}>{fB(dash.cpl)}</td>
                    <td style={{ padding: '10px 12px' }}></td>
                    <td style={{ padding: '10px 12px' }}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {dash.resumo && (
            <div style={{ background: P.card, border: '1px solid ' + P.bdr, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, fontFamily: "'Cormorant Garamond', serif" }}>📋 Resumo Executivo</div>
              <div style={{ fontSize: 14, lineHeight: 1.9, whiteSpace: 'pre-wrap' as const, color: P.mt }}>{dash.resumo}</div>
            </div>
          )}

          {ads.length === 0 && !dash.resumo && dash.faturamento === 0 && (
            <div style={{ textAlign: 'center', padding: 50, color: P.mt }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📊</div>
              <p style={{ fontSize: 15 }}>Dados de vendas serão atualizados em breve.</p>
            </div>
          )}
        </div>)}

        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 11, color: P.mt2 }}>
          {dash.updated_at && <span>Atualizado: {new Date(dash.updated_at).toLocaleDateString('pt-BR')} {new Date(dash.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · </span>}
          APR Digital
        </div>
      </div>
    </div>
  );
}
