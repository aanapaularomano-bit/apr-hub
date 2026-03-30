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

  if (loading) return (<div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', serif" }}><div style={{ textAlign: 'center', color: '#b8977e' }}><div style={{ fontSize: 32, marginBottom: 10 }}>⚡</div><span style={{ fontSize: 16, fontWeight: 600 }}>Carregando dashboard...</span></div></div>);

  if (!dash) return (<div style={{ minHeight: '100vh', background: '#faf9f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', serif" }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: 40, marginBottom: 12 }}>😕</div><h1 style={{ fontSize: 22, color: '#1a1a2e' }}>Dashboard não encontrado</h1><p style={{ color: '#94a3b8' }}>Verifique o link e tente novamente.</p></div></div>);

  const daily = dash.daily_data || [];
  const ads = dash.ads_data || [];
  const isDark = dash.theme === 'dark';
  const bg = isDark ? '#0f172a' : '#faf9f7';
  const card = isDark ? '#1e293b' : '#ffffff';
  const bdr = isDark ? '#334155' : '#e2e8f0';
  const tx = isDark ? '#f1f5f9' : '#1e293b';
  const mt = isDark ? '#94a3b8' : '#64748b';
  const accent = isDark ? '#60a5fa' : '#b8977e';
  const headerBg = isDark ? 'linear-gradient(135deg,#1e293b,#334155)' : 'linear-gradient(135deg,#b8977e,#d4a88c)';

  const KPI = ({ label, value, sub, color }: any) => (
    <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 12, padding: '18px 22px', textAlign: 'center' as const }}>
      <div style={{ fontSize: 12, color: mt, textTransform: 'uppercase' as const, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || tx, fontFamily: "'DM Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: mt, marginTop: 4 }}>{sub}</div>}
    </div>
  );

  // Budget bar
  const budgets = [
    { l: 'Captação', v: dash.budget_captacao, c: accent },
    { l: 'Aquecimento', v: dash.budget_aquecimento, c: '#f59e0b' },
    { l: 'Lembrete', v: dash.budget_lembrete, c: '#3b82f6' },
    { l: 'CPLs', v: dash.budget_cpls, c: '#8b5cf6' },
    { l: 'Carrinho', v: dash.budget_carrinho, c: '#22c55e' },
  ].filter(b => b.v > 0);

  // Chart - daily data
  const maxLeads = Math.max(...daily.map((d: any) => d.leads || 0), 1);
  const maxCPL = Math.max(...daily.map((d: any) => d.cpl || 0), 1);

  return (
    <div style={{ minHeight: '100vh', background: bg, color: tx, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: headerBg, padding: '28px 40px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{dash.title}</h1>
            {(dash.date_start || dash.date_end) && <div style={{ fontSize: 13, marginTop: 6, opacity: 0.8 }}>
              {dash.date_start && new Date(dash.date_start + 'T12:00:00').toLocaleDateString('pt-BR')} {dash.date_end && ' — ' + new Date(dash.date_end + 'T12:00:00').toLocaleDateString('pt-BR')}
            </div>}
          </div>
          {dash.budget_total > 0 && (
            <div style={{ textAlign: 'right' as const }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase' as const, opacity: 0.7 }}>Orçamento Total</div>
              <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{fB(dash.budget_total)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Budget breakdown */}
      {budgets.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'flex', gap: 1, marginTop: -1 }}>
            {budgets.map(b => (
              <div key={b.l} style={{ flex: 1, background: isDark ? '#1e293b' : '#f1ebe4', padding: '12px 16px', textAlign: 'center' as const, borderBottom: '3px solid ' + b.c }}>
                <div style={{ fontSize: 11, color: mt, fontWeight: 600, textTransform: 'uppercase' as const }}>{b.l}</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: tx }}>{fB(b.v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 40px 60px' }}>

        {/* Tab navigation */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 28, borderBottom: '2px solid ' + bdr }}>
          {[['captacao', '📊 Captação'], ['vendas', '💰 Vendas']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ padding: '12px 24px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700, color: tab === k ? accent : mt, borderBottom: tab === k ? '3px solid ' + accent : '3px solid transparent', fontFamily: "'DM Sans', serif" }}>{l}</button>
          ))}
        </div>

        {/* ═══ CAPTAÇÃO ═══ */}
        {tab === 'captacao' && (
          <div>
            {/* KPIs Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
              <KPI label="Leads" value={fN(dash.leads_total)} />
              <KPI label="CPL" value={fB(dash.cpl)} />
              <KPI label="Investimento" value={fB(dash.investimento)} />
            </div>

            {/* KPIs Row 2 - Confirmados */}
            {(dash.leads_confirmados > 0 || dash.leads_whatsapp > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
                {dash.leads_confirmados > 0 && <KPI label="Confirmados" value={fN(dash.leads_confirmados)} sub={'Taxa: ' + fP(dash.taxa_confirmacao)} />}
                {dash.leads_whatsapp > 0 && <KPI label="WhatsApp" value={fN(dash.leads_whatsapp)} sub={dash.grupos_whatsapp + ' grupos · ' + fP(dash.taxa_aderencia) + ' aderência'} />}
                {dash.leads_quentes > 0 && <KPI label="Quentes" value={fN(dash.leads_quentes)} color="#22c55e" />}
                {dash.leads_frios > 0 && <KPI label="Frios" value={fN(dash.leads_frios)} color="#ef4444" />}
              </div>
            )}

            {/* Daily Chart */}
            {daily.length > 0 && (
              <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '22px 28px', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Dados da captação por dia</h3>
                <div style={{ display: 'flex', gap: 4, fontSize: 12, color: mt, marginBottom: 16 }}>
                  <span>■ Leads</span> <span style={{ marginLeft: 12 }}>● CPL</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 180, position: 'relative' }}>
                  {daily.map((d: any, i: number) => {
                    const h = d.leads > 0 ? Math.max(12, (d.leads / maxLeads) * 150) : 4;
                    const cplY = d.cpl > 0 ? 150 - ((d.cpl / maxCPL) * 130) : 150;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, position: 'relative' }}>
                        {d.cpl > 0 && <div style={{ position: 'absolute', top: cplY, fontSize: 9, color: mt, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fB(d.cpl)}</div>}
                        {d.leads > 0 && <div style={{ fontSize: 10, color: tx, fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{d.leads}</div>}
                        <div style={{ width: '80%', height: h, borderRadius: 4, background: accent, opacity: 0.8 }} />
                        <div style={{ fontSize: 8, color: mt, writingMode: 'vertical-rl' as const, height: 40, overflow: 'hidden' }}>{d.date || ''}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Público Quente / Frio */}
            {(dash.leads_quentes > 0 || dash.leads_frios > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '18px 22px', textAlign: 'center' as const }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>🔥 Público Quente</h3>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: '#22c55e' }}>{fN(dash.leads_quentes)}</div>
                  <div style={{ fontSize: 13, color: mt }}>{dash.leads_total > 0 ? ((dash.leads_quentes / dash.leads_total) * 100).toFixed(1) + '%' : '0%'}</div>
                </div>
                <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '18px 22px', textAlign: 'center' as const }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>🧊 Público Frio</h3>
                  <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: '#3b82f6' }}>{fN(dash.leads_frios)}</div>
                  <div style={{ fontSize: 13, color: mt }}>{dash.leads_total > 0 ? ((dash.leads_frios / dash.leads_total) * 100).toFixed(1) + '%' : '0%'}</div>
                </div>
              </div>
            )}

            {/* Funil Meta Ads */}
            {dash.impressions > 0 && (
              <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '22px 28px', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 18px' }}>Métricas Principais de Captação — Meta Ads</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {[
                    { l: 'Impressões', v: fN(dash.impressions), rate: null, rateLabel: null },
                    { l: 'Cliques', v: fN(dash.cliques), rate: fP(dash.ctr), rateLabel: 'CTR' },
                    { l: 'Page View', v: fN(dash.page_views), rate: fP(dash.tx_carregamento), rateLabel: 'Tx Carreg.' },
                    { l: 'Leads', v: fN(dash.leads_total), rate: fP(dash.tx_conversao), rateLabel: 'Tx Conv.' },
                  ].map((item, i, arr) => (
                    <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      <div style={{ border: '1px solid ' + bdr, borderRadius: 10, padding: '14px 18px', textAlign: 'center' as const, minWidth: 110 }}>
                        <div style={{ fontSize: 11, color: mt, textTransform: 'uppercase' as const, fontWeight: 600 }}>{item.l}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{item.v}</div>
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 8px' }}>
                          {item.rate && <div style={{ fontSize: 10, color: mt, fontWeight: 600 }}>{item.rateLabel}</div>}
                          {item.rate && <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{item.rate}</div>}
                          <div style={{ fontSize: 16, color: mt }}>→</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Cost metrics */}
                <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
                  {[{ l: 'CPM', v: fB(dash.cpm) }, { l: 'CPC', v: fB(dash.cpc) }, { l: 'CPL', v: fB(dash.cpl) }].map(m => (
                    <div key={m.l} style={{ border: '1px solid ' + bdr, borderRadius: 10, padding: '10px 16px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 11, color: mt, fontWeight: 600 }}>{m.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono', monospace" }}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily table */}
            {daily.length > 0 && (
              <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '22px 28px', overflow: 'auto' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Desempenho Diário</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: '2px solid ' + bdr }}>
                    {['Data', 'Investimento', 'Leads', 'CPL'].map(h => <th key={h} style={{ textAlign: 'left' as const, padding: '8px 10px', color: mt, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{daily.map((d: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid ' + bdr }}>
                      <td style={{ padding: '8px 10px' }}>{d.date}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{fB(d.investimento || 0)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{d.leads || 0}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace", fontWeight: 600, color: accent }}>{fB(d.cpl || 0)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ VENDAS ═══ */}
        {tab === 'vendas' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 14, marginBottom: 20 }}>
              <KPI label="Faturamento" value={fB(dash.faturamento)} color="#22c55e" />
              <KPI label="Lucro" value={fB(dash.lucro)} color={dash.lucro > 0 ? '#22c55e' : '#ef4444'} />
              <KPI label="Vendas" value={fN(dash.vendas_total)} />
              <KPI label="Taxa Lista" value={fP(dash.taxa_lista)} />
              <KPI label="CAC" value={fB(dash.cac)} />
              <KPI label="ROAS" value={(dash.roas || 0).toFixed(2)} color={dash.roas >= 2 ? '#22c55e' : dash.roas >= 1 ? '#f59e0b' : '#ef4444'} />
            </div>

            {/* Ads table */}
            {ads.length > 0 && (
              <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '22px 28px', overflow: 'auto', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 14px' }}>Dados dos Anúncios</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: '2px solid ' + bdr }}>
                    {['Anúncio', 'Investimento', 'Leads', 'CPL', 'CTR', 'CPM'].map(h => <th key={h} style={{ textAlign: 'left' as const, padding: '8px 10px', color: mt, fontWeight: 700, fontSize: 11, textTransform: 'uppercase' as const }}>{h}</th>)}
                  </tr></thead>
                  <tbody>{ads.map((a: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid ' + bdr }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600 }}>{a.name}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace" }}>{fB(a.investimento || 0)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{a.leads || 0}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace", color: accent }}>{fB(a.cpl || 0)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace" }}>{fP(a.ctr || 0)}</td>
                      <td style={{ padding: '8px 10px', fontFamily: "'DM Mono', monospace" }}>{fB(a.cpm || 0)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {/* Resumo */}
            {dash.resumo && (
              <div style={{ background: card, border: '1px solid ' + bdr, borderRadius: 14, padding: '22px 28px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>📋 Resumo Executivo</h3>
                <div style={{ fontSize: 15, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const, color: mt }}>{dash.resumo}</div>
              </div>
            )}

            {ads.length === 0 && !dash.resumo && dash.faturamento === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: mt }}>
                <p style={{ fontSize: 15 }}>Dados de vendas serão preenchidos em breve.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: mt, opacity: 0.6 }}>
          {dash.updated_at && <span>Atualizado em {new Date(dash.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · </span>}
          APR Digital
        </div>
      </div>
    </div>
  );
}
