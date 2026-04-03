'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const fB = (n: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fN = (n: number) => (n || 0).toLocaleString('pt-BR');
const fP = (n: number) => (n || 0).toFixed(2).replace('.', ',') + '%';
const fK = (n: number) => n >= 1000000 ? (n / 1000000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : fN(n);

/* ═══════════════════════════════════════════════════════════
   THEMES
   ═══════════════════════════════════════════════════════════ */
const themes = {
  dark: {
    bg: '#0a0a1a', bg2: '#111128', bg3: '#1a1a3e',
    card: '#13132d', card2: '#1c1c42',
    bdr: 'rgba(99,102,241,0.15)', bdr2: 'rgba(99,102,241,0.25)',
    tx: '#e8e8f0', tx2: '#a0a0c0', tx3: '#6b6b90',
    accent: '#6366f1', accent2: '#818cf8', accent3: '#4f46e5',
    green: '#22c55e', red: '#ef4444', yellow: '#f59e0b', blue: '#3b82f6', cyan: '#06b6d4', purple: '#a855f7', pink: '#ec4899',
    gradientPrimary: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    gradientGreen: 'linear-gradient(135deg, #22c55e, #16a34a)',
    gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',
    gradientBlue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    shadow: '0 4px 24px rgba(0,0,0,0.4)',
    glow: '0 0 20px rgba(99,102,241,0.15)',
  },
  light: {
    bg: '#f8f7f4', bg2: '#ffffff', bg3: '#f0eeea',
    card: '#ffffff', card2: '#faf9f7',
    bdr: 'rgba(0,0,0,0.08)', bdr2: 'rgba(0,0,0,0.12)',
    tx: '#1a1a2e', tx2: '#555570', tx3: '#999aaa',
    accent: '#b8977e', accent2: '#c9a88f', accent3: '#a78468',
    green: '#16a34a', red: '#dc2626', yellow: '#d97706', blue: '#2563eb', cyan: '#0891b2', purple: '#7c3aed', pink: '#db2777',
    gradientPrimary: 'linear-gradient(135deg, #b8977e, #c9a88f)',
    gradientGreen: 'linear-gradient(135deg, #22c55e, #16a34a)',
    gradientRed: 'linear-gradient(135deg, #ef4444, #dc2626)',
    gradientBlue: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    shadow: '0 2px 12px rgba(0,0,0,0.06)',
    glow: '0 0 20px rgba(184,151,126,0.1)',
  }
};

type ThemeKey = keyof typeof themes;

/* ═══════════════════════════════════════════════════════════
   CHART COMPONENTS
   ═══════════════════════════════════════════════════════════ */

function BarChart({ data, labelKey, valueKey, valueKey2, color, color2, T, height = 220 }: any) {
  const max = Math.max(...data.map((d: any) => Math.max(d[valueKey] || 0, d[valueKey2] || 0)), 1);
  const barW = Math.max(Math.min(40, (600 / data.length) - 8), 16);
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, padding: '0 8px', minWidth: data.length * (barW + 12) }}>
        {data.map((d: any, i: number) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: height - 28 }}>
              <div style={{ width: barW / (valueKey2 ? 2 : 1), height: Math.max(((d[valueKey] || 0) / max) * (height - 40), 4), background: color || T.accent, borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: T.tx2, whiteSpace: 'nowrap' as const }}>{typeof d[valueKey] === 'number' && d[valueKey] > 0 ? (d[valueKey] >= 1000 ? fK(d[valueKey]) : fN(d[valueKey])) : ''}</div>
              </div>
              {valueKey2 && (
                <div style={{ width: barW / 2, height: Math.max(((d[valueKey2] || 0) / max) * (height - 40), 4), background: color2 || T.green, borderRadius: '4px 4px 0 0', transition: 'height 0.5s ease' }} />
              )}
            </div>
            <div style={{ fontSize: 9, color: T.tx3, marginTop: 6, textAlign: 'center' as const, maxWidth: barW + 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{d[labelKey]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ steps, T }: { steps: { label: string; value: number; rate?: string; color?: string }[]; T: any }) {
  const max = Math.max(...steps.map(s => s.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 110, fontSize: 11, color: T.tx2, textAlign: 'right' as const, flexShrink: 0 }}>{s.label}</div>
          <div style={{ flex: 1, position: 'relative', height: 32, background: T.bg3, borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.max((s.value / max) * 100, 5)}%`, background: s.color || T.accent, borderRadius: 6, transition: 'width 0.8s ease' }} />
            <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: '#fff', zIndex: 1 }}>{fN(s.value)}</div>
          </div>
          {s.rate && <div style={{ width: 60, fontSize: 11, color: T.green, fontWeight: 600, flexShrink: 0 }}>{s.rate}</div>}
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, T, size = 140 }: { segments: { label: string; value: number; color: string }[]; T: any; size?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  let cum = 0;
  const r = size / 2 - 10;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.filter(s => s.value > 0).map((s, i) => {
          const pct = s.value / total;
          const startAngle = cum * 2 * Math.PI - Math.PI / 2;
          cum += pct;
          const endAngle = cum * 2 * Math.PI - Math.PI / 2;
          const large = pct > 0.5 ? 1 : 0;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle - 0.001);
          const y2 = cy + r * Math.sin(endAngle - 0.001);
          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color} opacity={0.85} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.55} fill={T.card} />
        <text x={cx} y={cy - 6} textAnchor="middle" fill={T.tx} fontSize={16} fontWeight={700}>{fN(total)}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={T.tx3} fontSize={9}>total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: T.tx2 }}>{s.label}</span>
            <span style={{ color: T.tx, fontWeight: 600, marginLeft: 'auto' }}>{fP(s.value / total * 100)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, color, icon, T }: any) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: '16px 18px', position: 'relative', overflow: 'hidden', boxShadow: T.shadow }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color || T.accent }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: T.tx3, textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: '0.05em' }}>{label}</span>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || T.tx, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: T.tx3, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DataTable({ headers, rows, T }: { headers: string[]; rows: (string | number)[][]; T: any }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 10, border: `1px solid ${T.bdr}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>{headers.map((h, i) => (
            <th key={i} style={{ padding: '10px 14px', textAlign: i === 0 ? 'left' as const : 'right' as const, background: T.bg3, color: T.tx2, fontWeight: 700, fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: `1px solid ${T.bdr}` }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : T.bg3 + '40' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 14px', textAlign: ci === 0 ? 'left' as const : 'right' as const, color: T.tx, borderBottom: `1px solid ${T.bdr}`, fontFamily: ci > 0 ? "'JetBrains Mono', monospace" : 'inherit', fontSize: 11 }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, icon, children, T }: any) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: '20px 24px', boxShadow: T.shadow }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: T.tx, textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: 0 }}>{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}

function BudgetBar({ etapas, T }: { etapas: { label: string; previsto: number; realizado: number; color: string }[]; T: any }) {
  const totalPrev = etapas.reduce((a, e) => a + e.previsto, 0) || 1;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: T.bg3 }}>
        {etapas.map((e, i) => (
          <div key={i} style={{ width: `${(e.previsto / totalPrev) * 100}%`, background: e.color, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${Math.min((e.realizado / (e.previsto || 1)) * 100, 100)}%`, background: 'rgba(255,255,255,0.3)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px 16px' }}>
        {etapas.map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: e.color }} />
            <span style={{ color: T.tx2 }}>{e.label}:</span>
            <span style={{ color: T.tx, fontWeight: 600 }}>{fB(e.realizado)}</span>
            <span style={{ color: T.tx3 }}>/ {fB(e.previsto)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PAGE TEMPLATES
   ═══════════════════════════════════════════════════════════ */

// ─── SIMPLE TEMPLATE (2 pages: Captação + Vendas) ───
function SimpleTemplate({ dash, T }: { dash: any; T: any }) {
  const [page, setPage] = useState('captacao');
  const daily = dash.daily_data || [];
  const ads = dash.ads_data || [];
  const totalLeads = dash.leads_total || 0;
  const quentes = dash.leads_quentes || 0;
  const frios = dash.leads_frios || 0;
  const pctQ = totalLeads > 0 ? (quentes / totalLeads * 100) : 0;
  const pctF = totalLeads > 0 ? (frios / totalLeads * 100) : 0;

  const etapas = [
    { label: 'Captação', previsto: dash.budget_captacao || 0, realizado: dash.realizado_captacao || 0, color: T.blue },
    { label: 'Aquecimento', previsto: dash.budget_aquecimento || 0, realizado: dash.realizado_aquecimento || 0, color: T.cyan },
    { label: 'Lembrete', previsto: dash.budget_lembrete || 0, realizado: dash.realizado_lembrete || 0, color: T.purple },
    { label: 'CPLs', previsto: dash.budget_cpls || 0, realizado: dash.realizado_cpls || 0, color: T.yellow },
    { label: 'Carrinho', previsto: dash.budget_carrinho || 0, realizado: dash.realizado_carrinho || 0, color: T.green },
  ];

  const funnelSteps = [
    { label: 'Impressões', value: dash.impressions || 0, color: T.blue },
    { label: 'Cliques', value: dash.cliques || 0, rate: fP(dash.ctr || 0), color: T.cyan },
    { label: 'Page Views', value: dash.page_views || 0, rate: fP(dash.tx_carregamento || 0), color: T.purple },
    { label: 'Leads', value: totalLeads, rate: fP(dash.tx_conversao || 0), color: T.green },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, background: T.bg3, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ k: 'captacao', l: '📊 Captação' }, { k: 'vendas', l: '💰 Vendas' }].map(t => (
          <button key={t.k} onClick={() => setPage(t.k)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: page === t.k ? T.accent : 'transparent', color: page === t.k ? '#fff' : T.tx2, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>{t.l}</button>
        ))}
      </div>

      {page === 'captacao' && (
        <>
          {/* Budget */}
          <Section title="Orçamento por Etapa" icon="💵" T={T}>
            <BudgetBar etapas={etapas} T={T} />
          </Section>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <KPICard label="Leads" value={fN(totalLeads)} icon="👥" color={T.green} T={T} />
            <KPICard label="CPL" value={fB(dash.cpl || 0)} icon="💲" color={T.blue} T={T} />
            <KPICard label="Investimento" value={fB(dash.investimento || 0)} icon="📊" color={T.accent} T={T} />
            <KPICard label="CPM" value={fB(dash.cpm || 0)} icon="📡" color={T.purple} T={T} />
            <KPICard label="CPC" value={fB(dash.cpc || 0)} icon="🖱️" color={T.cyan} T={T} />
            <KPICard label="CTR" value={fP(dash.ctr || 0)} icon="📈" color={T.yellow} T={T} />
          </div>

          {/* Leads por dia */}
          {daily.length > 0 && (
            <Section title="Leads por Dia" icon="📅" T={T}>
              <BarChart data={daily} labelKey="date" valueKey="leads" valueKey2="cpl" color={T.accent} color2={T.green} T={T} />
            </Section>
          )}

          {/* Público Quente vs Frio */}
          <Section title="Público Quente vs Frio" icon="🔥" T={T}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <DonutChart segments={[
                { label: 'Quente 🔥', value: quentes, color: T.red },
                { label: 'Frio ❄️', value: frios, color: T.blue },
              ]} T={T} />
            </div>
          </Section>

          {/* Funil Meta Ads */}
          <Section title="Funil Meta Ads" icon="📉" T={T}>
            <FunnelChart steps={funnelSteps} T={T} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
              <div style={{ textAlign: 'center' as const, padding: 10, background: T.bg3, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.tx3 }}>CPM</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.tx, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpm || 0)}</div>
              </div>
              <div style={{ textAlign: 'center' as const, padding: 10, background: T.bg3, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.tx3 }}>CPC</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.tx, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpc || 0)}</div>
              </div>
              <div style={{ textAlign: 'center' as const, padding: 10, background: T.bg3, borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: T.tx3 }}>CPL</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: T.tx, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpl || 0)}</div>
              </div>
            </div>
          </Section>

          {/* Tabela diária */}
          {daily.length > 0 && (
            <Section title="Dados Diários" icon="📋" T={T}>
              <DataTable
                headers={['Data', 'Leads', 'CPL', 'Investimento', 'Impressões', 'Cliques']}
                rows={daily.map((d: any) => [d.date, fN(d.leads || 0), fB(d.cpl || 0), fB(d.investimento || 0), fN(d.impressions || 0), fN(d.cliques || 0)])}
                T={T}
              />
            </Section>
          )}
        </>
      )}

      {page === 'vendas' && (
        <>
          {/* KPIs vendas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <KPICard label="Faturamento" value={fB(dash.faturamento || 0)} icon="💰" color={T.green} T={T} />
            <KPICard label="Lucro" value={fB(dash.lucro || 0)} icon="📈" color={T.cyan} T={T} />
            <KPICard label="Vendas" value={fN(dash.vendas_total || 0)} icon="🛒" color={T.accent} T={T} />
            <KPICard label="ROAS" value={(dash.roas || 0).toFixed(2) + 'x'} icon="🎯" color={T.yellow} T={T} />
            <KPICard label="CAC" value={fB(dash.cac || 0)} icon="💲" color={T.red} T={T} />
            <KPICard label="Taxa Lista" value={fP(dash.taxa_lista || 0)} icon="📊" color={T.purple} T={T} />
          </div>

          {/* Funil de vendas */}
          <Section title="Funil de Vendas" icon="🛒" T={T}>
            <FunnelChart steps={[
              { label: 'Leads', value: totalLeads, color: T.blue },
              { label: 'Checkout', value: dash.checkouts || 0, rate: totalLeads > 0 ? fP((dash.checkouts || 0) / totalLeads * 100) : '0%', color: T.cyan },
              { label: 'Vendas', value: dash.vendas_total || 0, rate: (dash.checkouts || 0) > 0 ? fP((dash.vendas_total || 0) / (dash.checkouts || 0) * 100) : '0%', color: T.green },
            ]} T={T} />
          </Section>

          {/* Tabela anúncios */}
          {ads.length > 0 && (
            <Section title="Performance de Anúncios" icon="📢" T={T}>
              <DataTable
                headers={['Anúncio', 'Investimento', 'Leads', 'CPL', 'CTR', 'ROAS']}
                rows={ads.map((a: any) => [a.name || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), (a.roas || 0).toFixed(2) + 'x'])}
                T={T}
              />
            </Section>
          )}

          {/* Resumo */}
          {dash.resumo && (
            <Section title="Resumo Executivo" icon="📝" T={T}>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: T.tx2, whiteSpace: 'pre-wrap' as const }}>{dash.resumo}</div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

// ─── COMPLETE TEMPLATE (7 pages: Concurso Agro style) ───
function CompleteTemplate({ dash, T }: { dash: any; T: any }) {
  const [page, setPage] = useState('visao_geral');
  const daily = dash.daily_data || [];
  const ads = dash.ads_data || [];
  const audiences = dash.audiences_data || [];
  const pages_data = dash.pages_data || [];
  const origins = dash.origins_data || [];
  const survey = dash.survey_data || {};

  const tabs = [
    { k: 'visao_geral', l: '📊 Visão Geral' },
    { k: 'captacao', l: '📈 Captação' },
    { k: 'anuncios', l: '📢 Anúncios' },
    { k: 'publicos', l: '👥 Públicos' },
    { k: 'origens', l: '🔗 Origens' },
    { k: 'vendas', l: '💰 Vendas' },
    { k: 'pesquisa', l: '📋 Pesquisa' },
  ];

  const totalLeads = dash.leads_total || 0;
  const quentes = dash.leads_quentes || 0;
  const frios = dash.leads_frios || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Tab nav */}
      <div style={{ display: 'flex', gap: 0, background: T.bg3, borderRadius: 10, padding: 4, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setPage(t.k)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: page === t.k ? T.accent : 'transparent', color: page === t.k ? '#fff' : T.tx2, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{t.l}</button>
        ))}
      </div>

      {/* ─── VISÃO GERAL ─── */}
      {page === 'visao_geral' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="Leads" value={fN(totalLeads)} icon="👥" color={T.green} T={T} />
            <KPICard label="CPL" value={fB(dash.cpl || 0)} icon="💲" color={T.blue} T={T} />
            <KPICard label="Investimento" value={fB(dash.investimento || 0)} icon="📊" color={T.accent} T={T} />
            <KPICard label="Faturamento" value={fB(dash.faturamento || 0)} icon="💰" color={T.green} T={T} />
            <KPICard label="ROAS" value={(dash.roas || 0).toFixed(2) + 'x'} icon="🎯" color={T.yellow} T={T} />
            <KPICard label="Vendas" value={fN(dash.vendas_total || 0)} icon="🛒" color={T.purple} T={T} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Público Quente vs Frio" icon="🔥" T={T}>
              <DonutChart segments={[
                { label: 'Quente 🔥', value: quentes, color: T.red },
                { label: 'Frio ❄️', value: frios, color: T.blue },
              ]} T={T} />
            </Section>
            <Section title="Funil Resumo" icon="📉" T={T}>
              <FunnelChart steps={[
                { label: 'Impressões', value: dash.impressions || 0, color: T.blue },
                { label: 'Leads', value: totalLeads, color: T.green },
                { label: 'Vendas', value: dash.vendas_total || 0, color: T.yellow },
              ]} T={T} />
            </Section>
          </div>

          {daily.length > 0 && (
            <Section title="Evolução Diária" icon="📅" T={T}>
              <BarChart data={daily} labelKey="date" valueKey="leads" color={T.accent} T={T} />
            </Section>
          )}
        </>
      )}

      {/* ─── CAPTAÇÃO ─── */}
      {page === 'captacao' && (
        <>
          <Section title="Orçamento por Etapa" icon="💵" T={T}>
            <BudgetBar etapas={[
              { label: 'Captação', previsto: dash.budget_captacao || 0, realizado: dash.realizado_captacao || 0, color: T.blue },
              { label: 'Aquecimento', previsto: dash.budget_aquecimento || 0, realizado: dash.realizado_aquecimento || 0, color: T.cyan },
              { label: 'Lembrete', previsto: dash.budget_lembrete || 0, realizado: dash.realizado_lembrete || 0, color: T.purple },
              { label: 'CPLs', previsto: dash.budget_cpls || 0, realizado: dash.realizado_cpls || 0, color: T.yellow },
              { label: 'Carrinho', previsto: dash.budget_carrinho || 0, realizado: dash.realizado_carrinho || 0, color: T.green },
            ]} T={T} />
          </Section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="Leads" value={fN(totalLeads)} icon="👥" color={T.green} T={T} />
            <KPICard label="CPL" value={fB(dash.cpl || 0)} icon="💲" color={T.blue} T={T} />
            <KPICard label="Investimento" value={fB(dash.investimento || 0)} icon="📊" color={T.accent} T={T} />
            <KPICard label="Confirmados" value={fN(dash.leads_confirmados || 0)} sub={`Taxa: ${fP(dash.taxa_confirmacao || 0)}`} icon="✅" color={T.green} T={T} />
          </div>

          <Section title="Funil Meta Ads Completo" icon="📉" T={T}>
            <FunnelChart steps={[
              { label: 'Impressões', value: dash.impressions || 0, color: T.blue },
              { label: 'Alcance', value: dash.alcance || 0, color: '#60a5fa' },
              { label: 'Cliques', value: dash.cliques || 0, rate: fP(dash.ctr || 0), color: T.cyan },
              { label: 'Page Views', value: dash.page_views || 0, rate: fP(dash.tx_carregamento || 0), color: T.purple },
              { label: 'Leads', value: totalLeads, rate: fP(dash.tx_conversao || 0), color: T.green },
            ]} T={T} />
          </Section>

          {daily.length > 0 && (
            <Section title="Dados Diários" icon="📋" T={T}>
              <DataTable
                headers={['Data', 'Leads', 'CPL', 'Invest.', 'Impressões', 'Cliques', 'CTR']}
                rows={daily.map((d: any) => [d.date, fN(d.leads || 0), fB(d.cpl || 0), fB(d.investimento || 0), fN(d.impressions || 0), fN(d.cliques || 0), fP(d.ctr || 0)])}
                T={T}
              />
            </Section>
          )}
        </>
      )}

      {/* ─── ANÚNCIOS ─── */}
      {page === 'anuncios' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="Total Anúncios" value={fN(ads.length)} icon="📢" color={T.accent} T={T} />
            <KPICard label="Invest. Total" value={fB(ads.reduce((a: number, d: any) => a + (d.investimento || 0), 0))} icon="💰" color={T.blue} T={T} />
            <KPICard label="Leads Total" value={fN(ads.reduce((a: number, d: any) => a + (d.leads || 0), 0))} icon="👥" color={T.green} T={T} />
          </div>

          {ads.length > 0 ? (
            <Section title="Performance por Anúncio" icon="📊" T={T}>
              <DataTable
                headers={['Anúncio', 'Tipo', 'Invest.', 'Leads', 'CPL', 'CTR', 'CPM', 'ROAS']}
                rows={ads.map((a: any) => [a.name || '-', a.type || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), fB(a.cpm || 0), (a.roas || 0).toFixed(2) + 'x'])}
                T={T}
              />
            </Section>
          ) : (
            <Section title="Anúncios" T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de anúncio cadastrado</div></Section>
          )}
        </>
      )}

      {/* ─── PÚBLICOS ─── */}
      {page === 'publicos' && (
        <>
          <Section title="Público Quente vs Frio" icon="🔥" T={T}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <DonutChart segments={[
                  { label: 'Quente 🔥', value: quentes, color: T.red },
                  { label: 'Frio ❄️', value: frios, color: T.blue },
                ]} T={T} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 14, background: T.bg3, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: T.tx3, marginBottom: 4 }}>🔥 CPL Quente</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpl_quente || 0)}</div>
                </div>
                <div style={{ padding: 14, background: T.bg3, borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: T.tx3, marginBottom: 4 }}>❄️ CPL Frio</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: T.blue, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpl_frio || 0)}</div>
                </div>
              </div>
            </div>
          </Section>

          {audiences.length > 0 && (
            <Section title="Performance por Público" icon="👥" T={T}>
              <DataTable
                headers={['Público', 'Temp.', 'Invest.', 'Leads', 'CPL', 'CTR', 'ROAS']}
                rows={audiences.map((a: any) => [a.name || '-', a.temperature || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), (a.roas || 0).toFixed(2) + 'x'])}
                T={T}
              />
            </Section>
          )}
        </>
      )}

      {/* ─── ORIGENS ─── */}
      {page === 'origens' && (
        <>
          <Section title="Leads por Origem" icon="🔗" T={T}>
            {origins.length > 0 ? (
              <>
                <DonutChart segments={origins.map((o: any, i: number) => ({
                  label: o.name || `Origem ${i + 1}`,
                  value: o.leads || 0,
                  color: [T.blue, T.green, T.purple, T.yellow, T.red, T.cyan, T.pink][i % 7],
                }))} T={T} size={160} />
                <div style={{ marginTop: 16 }}>
                  <DataTable
                    headers={['Origem', 'Leads', 'CPL', 'Invest.', 'ROAS']}
                    rows={origins.map((o: any) => [o.name || '-', fN(o.leads || 0), fB(o.cpl || 0), fB(o.investimento || 0), (o.roas || 0).toFixed(2) + 'x'])}
                    T={T}
                  />
                </div>
              </>
            ) : (
              <div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de origem cadastrado</div>
            )}
          </Section>

          {pages_data.length > 0 && (
            <Section title="Performance por Página" icon="📄" T={T}>
              <DataTable
                headers={['Página', 'Visitas', 'Leads', 'Taxa Conv.', 'Tempo Médio']}
                rows={pages_data.map((p: any) => [p.name || '-', fN(p.visits || 0), fN(p.leads || 0), fP(p.conversion || 0), p.avg_time || '-'])}
                T={T}
              />
            </Section>
          )}
        </>
      )}

      {/* ─── VENDAS ─── */}
      {page === 'vendas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="Faturamento" value={fB(dash.faturamento || 0)} icon="💰" color={T.green} T={T} />
            <KPICard label="Lucro" value={fB(dash.lucro || 0)} icon="📈" color={T.cyan} T={T} />
            <KPICard label="Vendas" value={fN(dash.vendas_total || 0)} icon="🛒" color={T.accent} T={T} />
            <KPICard label="ROAS" value={(dash.roas || 0).toFixed(2) + 'x'} icon="🎯" color={T.yellow} T={T} />
            <KPICard label="CAC" value={fB(dash.cac || 0)} icon="💲" color={T.red} T={T} />
            <KPICard label="Ticket Médio" value={fB(dash.ticket_medio || 0)} icon="🎫" color={T.purple} T={T} />
          </div>

          <Section title="Funil de Vendas" icon="🛒" T={T}>
            <FunnelChart steps={[
              { label: 'Leads', value: totalLeads, color: T.blue },
              { label: 'Página Vendas', value: dash.visits_vendas || 0, color: T.cyan },
              { label: 'Checkout', value: dash.checkouts || 0, color: T.purple },
              { label: 'Compras', value: dash.vendas_total || 0, color: T.green },
            ]} T={T} />
          </Section>

          {dash.resumo && (
            <Section title="Resumo Executivo" icon="📝" T={T}>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: T.tx2, whiteSpace: 'pre-wrap' as const }}>{dash.resumo}</div>
            </Section>
          )}
        </>
      )}

      {/* ─── PESQUISA ─── */}
      {page === 'pesquisa' && (
        <>
          <Section title="Perfil da Pesquisa" icon="📋" T={T}>
            {Object.keys(survey).length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {Object.entries(survey).map(([key, data]: [string, any]) => (
                  <div key={key} style={{ padding: 16, background: T.bg3, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.tx, marginBottom: 10, textTransform: 'capitalize' as const }}>{key.replace(/_/g, ' ')}</div>
                    {Array.isArray(data) ? data.map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: `1px solid ${T.bdr}` }}>
                        <span style={{ fontSize: 11, color: T.tx2 }}>{item.label || item}</span>
                        {item.value !== undefined && <span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{typeof item.value === 'number' ? fP(item.value) : item.value}</span>}
                      </div>
                    )) : (
                      <div style={{ fontSize: 13, color: T.tx2 }}>{String(data)}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de pesquisa cadastrado</div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

// ─── MEGA TEMPLATE (30+ pages: Renata Bacha style) ───
function MegaTemplate({ dash, T }: { dash: any; T: any }) {
  const [page, setPage] = useState('captacao');
  const daily = dash.daily_data || [];
  const ads = dash.ads_data || [];
  const audiences = dash.audiences_data || [];
  const origins = dash.origins_data || [];
  const creatives_fb = dash.creatives_fb || [];
  const creatives_ig = dash.creatives_ig || [];
  const creatives_yt = dash.creatives_yt || [];
  const audiences_fb = dash.audiences_fb || [];
  const audiences_ig = dash.audiences_ig || [];
  const audiences_yt = dash.audiences_yt || [];
  const weekly = dash.weekly_data || [];
  const survey = dash.survey_data || {};
  const vendas_diarias = dash.vendas_diarias || [];
  const totalLeads = dash.leads_total || 0;
  const quentes = dash.leads_quentes || 0;
  const frios = dash.leads_frios || 0;

  const megaTabs = [
    { k: 'captacao', l: '📊 Captação' },
    { k: 'dados_anuncios', l: '📢 Dados Anúncios' },
    { k: 'quente_frio', l: '🔥 Quente/Frio' },
    { k: 'qualificacao', l: '🎯 Qualificação' },
    { k: 'vendas', l: '💰 Vendas' },
    { k: 'fontes', l: '🔗 Fontes Tráfego' },
    { k: 'semanal', l: '📅 Semanal' },
    { k: 'temperatura', l: '🌡️ Temperatura' },
    { k: 'criativo_fb', l: '🎨 Criativos FB' },
    { k: 'criativo_ig', l: '📸 Criativos IG' },
    { k: 'criativo_yt', l: '▶️ Criativos YT' },
    { k: 'publico_fb', l: '👥 Públicos FB' },
    { k: 'publico_ig', l: '👥 Públicos IG' },
    { k: 'publico_yt', l: '👥 Públicos YT' },
    { k: 'pesquisa', l: '📋 Pesquisa' },
    { k: 'info_geral', l: 'ℹ️ Info Geral' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Scrollable tabs */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 0, background: T.bg3, borderRadius: 10, padding: 4, width: 'max-content' }}>
          {megaTabs.map(t => (
            <button key={t.k} onClick={() => setPage(t.k)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: page === t.k ? T.accent : 'transparent', color: page === t.k ? '#fff' : T.tx2, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* ─── CAPTAÇÃO ─── */}
      {page === 'captacao' && (
        <>
          <Section title="Orçamento por Etapa" icon="💵" T={T}>
            <BudgetBar etapas={[
              { label: 'Captação', previsto: dash.budget_captacao || 0, realizado: dash.realizado_captacao || 0, color: T.blue },
              { label: 'Aquecimento', previsto: dash.budget_aquecimento || 0, realizado: dash.realizado_aquecimento || 0, color: T.cyan },
              { label: 'Lembrete', previsto: dash.budget_lembrete || 0, realizado: dash.realizado_lembrete || 0, color: T.purple },
              { label: 'CPLs', previsto: dash.budget_cpls || 0, realizado: dash.realizado_cpls || 0, color: T.yellow },
              { label: 'Carrinho', previsto: dash.budget_carrinho || 0, realizado: dash.realizado_carrinho || 0, color: T.green },
            ]} T={T} />
          </Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <KPICard label="Leads" value={fN(totalLeads)} icon="👥" color={T.green} T={T} />
            <KPICard label="CPL" value={fB(dash.cpl || 0)} icon="💲" color={T.blue} T={T} />
            <KPICard label="Investimento" value={fB(dash.investimento || 0)} icon="📊" color={T.accent} T={T} />
            <KPICard label="CPM" value={fB(dash.cpm || 0)} icon="📡" color={T.purple} T={T} />
            <KPICard label="CPC" value={fB(dash.cpc || 0)} icon="🖱️" color={T.cyan} T={T} />
            <KPICard label="CTR" value={fP(dash.ctr || 0)} icon="📈" color={T.yellow} T={T} />
            <KPICard label="Confirmados" value={fN(dash.leads_confirmados || 0)} icon="✅" color={T.green} T={T} />
            <KPICard label="WhatsApp" value={fN(dash.leads_whatsapp || 0)} icon="💬" color='#25D366' T={T} />
          </div>
          <Section title="Funil Meta Ads" icon="📉" T={T}>
            <FunnelChart steps={[
              { label: 'Impressões', value: dash.impressions || 0, color: T.blue },
              { label: 'Alcance', value: dash.alcance || 0, color: '#60a5fa' },
              { label: 'Cliques', value: dash.cliques || 0, rate: fP(dash.ctr || 0), color: T.cyan },
              { label: 'Page Views', value: dash.page_views || 0, rate: fP(dash.tx_carregamento || 0), color: T.purple },
              { label: 'Leads', value: totalLeads, rate: fP(dash.tx_conversao || 0), color: T.green },
              { label: 'Confirmados', value: dash.leads_confirmados || 0, rate: fP(dash.taxa_confirmacao || 0), color: T.yellow },
            ]} T={T} />
          </Section>
          {daily.length > 0 && (
            <>
              <Section title="Leads por Dia" icon="📅" T={T}>
                <BarChart data={daily} labelKey="date" valueKey="leads" color={T.accent} T={T} height={200} />
              </Section>
              <Section title="Dados Diários Completos" icon="📋" T={T}>
                <DataTable
                  headers={['Data', 'Leads', 'CPL', 'Invest.', 'Impressões', 'Cliques', 'CTR', 'CPC']}
                  rows={daily.map((d: any) => [d.date, fN(d.leads || 0), fB(d.cpl || 0), fB(d.investimento || 0), fN(d.impressions || 0), fN(d.cliques || 0), fP(d.ctr || 0), fB(d.cpc || 0)])}
                  T={T}
                />
              </Section>
            </>
          )}
        </>
      )}

      {/* ─── DADOS ANÚNCIOS ─── */}
      {page === 'dados_anuncios' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <KPICard label="Total Anúncios" value={fN(ads.length)} icon="📢" color={T.accent} T={T} />
            <KPICard label="Invest. Total" value={fB(ads.reduce((a: number, d: any) => a + (d.investimento || 0), 0))} icon="💰" color={T.blue} T={T} />
            <KPICard label="Leads Anúncios" value={fN(ads.reduce((a: number, d: any) => a + (d.leads || 0), 0))} icon="👥" color={T.green} T={T} />
            <KPICard label="Melhor CPL" value={fB(Math.min(...ads.filter((a: any) => a.cpl > 0).map((a: any) => a.cpl || 999)))} icon="⭐" color={T.yellow} T={T} />
          </div>
          {ads.length > 0 ? (
            <>
              <Section title="Meta Ads — Performance por Anúncio" icon="📊" T={T}>
                <DataTable
                  headers={['Anúncio', 'Tipo', 'Invest.', 'Leads', 'CPL', 'CTR', 'CPM', 'CPC', 'ROAS']}
                  rows={ads.filter((a: any) => a.platform === 'meta' || !a.platform).map((a: any) => [a.name || '-', a.type || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), fB(a.cpm || 0), fB(a.cpc || 0), (a.roas || 0).toFixed(2) + 'x'])}
                  T={T}
                />
              </Section>
              {ads.some((a: any) => a.platform === 'google') && (
                <Section title="Google Ads — Performance por Anúncio" icon="🔍" T={T}>
                  <DataTable
                    headers={['Anúncio', 'Tipo', 'Invest.', 'Leads', 'CPL', 'CTR', 'CPC', 'ROAS']}
                    rows={ads.filter((a: any) => a.platform === 'google').map((a: any) => [a.name || '-', a.type || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), fB(a.cpc || 0), (a.roas || 0).toFixed(2) + 'x'])}
                    T={T}
                  />
                </Section>
              )}
            </>
          ) : (
            <Section title="Anúncios" T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado cadastrado</div></Section>
          )}
        </>
      )}

      {/* ─── QUENTE/FRIO ─── */}
      {page === 'quente_frio' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="Distribuição" icon="🔥" T={T}>
              <DonutChart segments={[
                { label: 'Quente 🔥', value: quentes, color: T.red },
                { label: 'Frio ❄️', value: frios, color: T.blue },
              ]} T={T} size={160} />
            </Section>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Section title="CPL por Temperatura" T={T}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 14, background: 'rgba(239,68,68,0.1)', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 10, color: T.red }}>🔥 CPL Quente</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpl_quente || 0)}</div>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(59,130,246,0.1)', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 10, color: T.blue }}>❄️ CPL Frio</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.blue, fontFamily: "'JetBrains Mono', monospace" }}>{fB(dash.cpl_frio || 0)}</div>
                  </div>
                </div>
              </Section>
              <Section title="ROAS por Temperatura" T={T}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ padding: 14, background: 'rgba(239,68,68,0.1)', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 10, color: T.red }}>🔥 ROAS Quente</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.red, fontFamily: "'JetBrains Mono', monospace" }}>{(dash.roas_quente || 0).toFixed(2)}x</div>
                  </div>
                  <div style={{ padding: 14, background: 'rgba(59,130,246,0.1)', borderRadius: 10, textAlign: 'center' as const }}>
                    <div style={{ fontSize: 10, color: T.blue }}>❄️ ROAS Frio</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: T.blue, fontFamily: "'JetBrains Mono', monospace" }}>{(dash.roas_frio || 0).toFixed(2)}x</div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </>
      )}

      {/* ─── QUALIFICAÇÃO ─── */}
      {page === 'qualificacao' && (
        <>
          {(dash.qualification_data || []).length > 0 ? (
            <>
              <Section title="Qualificação por Objetivo" icon="🎯" T={T}>
                <DonutChart segments={(dash.qualification_data || []).map((q: any, i: number) => ({
                  label: q.label, value: q.value,
                  color: [T.green, T.blue, T.purple, T.yellow, T.red, T.cyan][i % 6],
                }))} T={T} size={160} />
              </Section>
              <Section title="Detalhamento" icon="📋" T={T}>
                <DataTable
                  headers={['Objetivo', 'Leads', '% do Total', 'Vendas', 'Taxa Conv.']}
                  rows={(dash.qualification_data || []).map((q: any) => [q.label, fN(q.value || 0), fP(q.pct || 0), fN(q.vendas || 0), fP(q.conversion || 0)])}
                  T={T}
                />
              </Section>
            </>
          ) : (
            <Section title="Qualificação" T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de qualificação cadastrado</div></Section>
          )}
        </>
      )}

      {/* ─── VENDAS ─── */}
      {page === 'vendas' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            <KPICard label="Faturamento" value={fB(dash.faturamento || 0)} icon="💰" color={T.green} T={T} />
            <KPICard label="Lucro" value={fB(dash.lucro || 0)} icon="📈" color={T.cyan} T={T} />
            <KPICard label="Vendas" value={fN(dash.vendas_total || 0)} icon="🛒" color={T.accent} T={T} />
            <KPICard label="ROAS" value={(dash.roas || 0).toFixed(2) + 'x'} icon="🎯" color={T.yellow} T={T} />
            <KPICard label="CAC" value={fB(dash.cac || 0)} icon="💲" color={T.red} T={T} />
            <KPICard label="Ticket Médio" value={fB(dash.ticket_medio || 0)} icon="🎫" color={T.purple} T={T} />
          </div>
          <Section title="Funil de Vendas" icon="🛒" T={T}>
            <FunnelChart steps={[
              { label: 'Leads', value: totalLeads, color: T.blue },
              { label: 'Pág. Vendas', value: dash.visits_vendas || 0, color: T.cyan },
              { label: 'Checkout', value: dash.checkouts || 0, color: T.purple },
              { label: 'Compras', value: dash.vendas_total || 0, color: T.green },
            ]} T={T} />
          </Section>
          {vendas_diarias.length > 0 && (
            <Section title="Vendas por Dia" icon="📅" T={T}>
              <BarChart data={vendas_diarias} labelKey="date" valueKey="vendas" valueKey2="faturamento_k" color={T.green} color2={T.yellow} T={T} />
              <DataTable
                headers={['Data', 'Vendas', 'Faturamento', 'Origem', 'Meio Pgto']}
                rows={vendas_diarias.map((d: any) => [d.date, fN(d.vendas || 0), fB(d.faturamento || 0), d.origem || '-', d.meio || '-'])}
                T={T}
              />
            </Section>
          )}
        </>
      )}

      {/* ─── FONTES DE TRÁFEGO ─── */}
      {page === 'fontes' && (
        <>
          <Section title="Performance por Fonte" icon="🔗" T={T}>
            {origins.length > 0 ? (
              <>
                <DonutChart segments={origins.map((o: any, i: number) => ({
                  label: o.name, value: o.leads || 0,
                  color: [T.blue, T.green, T.purple, T.yellow, T.red, T.cyan, T.pink][i % 7],
                }))} T={T} size={160} />
                <div style={{ marginTop: 16 }}>
                  <DataTable
                    headers={['Fonte', 'Invest.', 'Leads', 'CPL', 'Faturamento', 'ROAS']}
                    rows={origins.map((o: any) => [o.name || '-', fB(o.investimento || 0), fN(o.leads || 0), fB(o.cpl || 0), fB(o.faturamento || 0), (o.roas || 0).toFixed(2) + 'x'])}
                    T={T}
                  />
                </div>
              </>
            ) : (
              <div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de fonte cadastrado</div>
            )}
          </Section>
        </>
      )}

      {/* ─── SEMANAL ─── */}
      {page === 'semanal' && (
        <>
          {weekly.length > 0 ? (
            <>
              <Section title="Performance Semanal" icon="📅" T={T}>
                <DataTable
                  headers={['Semana', 'Invest.', 'Leads', 'CPL', 'Faturamento', 'ROAS', 'Conv.']}
                  rows={weekly.map((w: any) => [w.week || '-', fB(w.investimento || 0), fN(w.leads || 0), fB(w.cpl || 0), fB(w.faturamento || 0), (w.roas || 0).toFixed(2) + 'x', fP(w.conversion || 0)])}
                  T={T}
                />
              </Section>
              <Section title="Evolução Semanal" icon="📊" T={T}>
                <BarChart data={weekly} labelKey="week" valueKey="leads" valueKey2="vendas" color={T.blue} color2={T.green} T={T} />
              </Section>
            </>
          ) : (
            <Section title="Semanal" T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado semanal cadastrado</div></Section>
          )}
        </>
      )}

      {/* ─── TEMPERATURA ─── */}
      {page === 'temperatura' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="🔥 Público Quente" T={T}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ l: 'Leads', v: fN(quentes) }, { l: 'CPL', v: fB(dash.cpl_quente || 0) }, { l: 'Investimento', v: fB(dash.invest_quente || 0) }, { l: 'ROAS', v: (dash.roas_quente || 0).toFixed(2) + 'x' }, { l: 'Faturamento', v: fB(dash.fat_quente || 0) }].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.bdr}`, fontSize: 12 }}>
                    <span style={{ color: T.tx2 }}>{r.l}</span>
                    <span style={{ color: T.red, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="❄️ Público Frio" T={T}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ l: 'Leads', v: fN(frios) }, { l: 'CPL', v: fB(dash.cpl_frio || 0) }, { l: 'Investimento', v: fB(dash.invest_frio || 0) }, { l: 'ROAS', v: (dash.roas_frio || 0).toFixed(2) + 'x' }, { l: 'Faturamento', v: fB(dash.fat_frio || 0) }].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.bdr}`, fontSize: 12 }}>
                    <span style={{ color: T.tx2 }}>{r.l}</span>
                    <span style={{ color: T.blue, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </>
      )}

      {/* ─── CRIATIVOS FB / IG / YT ─── */}
      {['criativo_fb', 'criativo_ig', 'criativo_yt'].includes(page) && (() => {
        const map: any = { criativo_fb: { data: creatives_fb, title: 'Facebook Ads', icon: '🎨' }, criativo_ig: { data: creatives_ig, title: 'Instagram Ads', icon: '📸' }, criativo_yt: { data: creatives_yt, title: 'YouTube Ads', icon: '▶️' } };
        const { data: cData, title: cTitle, icon: cIcon } = map[page];
        return cData.length > 0 ? (
          <Section title={`Criativos — ${cTitle}`} icon={cIcon} T={T}>
            <DataTable
              headers={['Criativo', 'Tipo', 'Temp.', 'Invest.', 'Leads', 'CPL', 'CTR', 'ROAS']}
              rows={cData.map((c: any) => [c.name || '-', c.type || '-', c.temperature || '-', fB(c.investimento || 0), fN(c.leads || 0), fB(c.cpl || 0), fP(c.ctr || 0), (c.roas || 0).toFixed(2) + 'x'])}
              T={T}
            />
          </Section>
        ) : (
          <Section title={`Criativos — ${cTitle}`} icon={cIcon} T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado cadastrado</div></Section>
        );
      })()}

      {/* ─── PÚBLICOS FB / IG / YT ─── */}
      {['publico_fb', 'publico_ig', 'publico_yt'].includes(page) && (() => {
        const map: any = { publico_fb: { data: audiences_fb, title: 'Facebook Ads', icon: '👥' }, publico_ig: { data: audiences_ig, title: 'Instagram Ads', icon: '👥' }, publico_yt: { data: audiences_yt, title: 'YouTube Ads', icon: '👥' } };
        const { data: aData, title: aTitle, icon: aIcon } = map[page];
        return aData.length > 0 ? (
          <Section title={`Públicos — ${aTitle}`} icon={aIcon} T={T}>
            <DataTable
              headers={['Público', 'Temp.', 'Invest.', 'Leads', 'CPL', 'CTR', 'ROAS']}
              rows={aData.map((a: any) => [a.name || '-', a.temperature || '-', fB(a.investimento || 0), fN(a.leads || 0), fB(a.cpl || 0), fP(a.ctr || 0), (a.roas || 0).toFixed(2) + 'x'])}
              T={T}
            />
          </Section>
        ) : (
          <Section title={`Públicos — ${aTitle}`} icon={aIcon} T={T}><div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado cadastrado</div></Section>
        );
      })()}

      {/* ─── PESQUISA ─── */}
      {page === 'pesquisa' && (
        <Section title="Perfil da Pesquisa — Leads vs Compradores" icon="📋" T={T}>
          {Object.keys(survey).length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {Object.entries(survey).map(([key, data]: [string, any]) => (
                <div key={key} style={{ padding: 16, background: T.bg3, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.tx, marginBottom: 10, textTransform: 'capitalize' as const }}>{key.replace(/_/g, ' ')}</div>
                  {Array.isArray(data) ? data.map((item: any, i: number) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${T.bdr}`, fontSize: 11 }}>
                      <span style={{ color: T.tx2 }}>{item.label || item}</span>
                      {item.leads !== undefined && <span style={{ color: T.accent, fontWeight: 600 }}>Leads: {fP(item.leads)}</span>}
                      {item.buyers !== undefined && <span style={{ color: T.green, fontWeight: 600, marginLeft: 8 }}>Comprad.: {fP(item.buyers)}</span>}
                    </div>
                  )) : (
                    <div style={{ fontSize: 13, color: T.tx2 }}>{String(data)}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: T.tx3, fontSize: 13, textAlign: 'center' as const, padding: 40 }}>Nenhum dado de pesquisa cadastrado</div>
          )}
        </Section>
      )}

      {/* ─── INFO GERAL ─── */}
      {page === 'info_geral' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Section title="WhatsApp" icon="💬" T={T}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ l: 'Leads WhatsApp', v: fN(dash.leads_whatsapp || 0) }, { l: 'Grupos', v: fN(dash.grupos_whatsapp || 0) }, { l: 'Taxa Aderência', v: fP(dash.taxa_aderencia || 0) }].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.bdr}`, fontSize: 12 }}>
                    <span style={{ color: T.tx2 }}>{r.l}</span>
                    <span style={{ color: T.tx, fontWeight: 700 }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Section>
            <Section title="Tracking & CPLs" icon="📡" T={T}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ l: 'CPL Meta Ads', v: fB(dash.cpl || 0) }, { l: 'CPL Google Ads', v: fB(dash.cpl_google || 0) }, { l: 'CPL Geral', v: fB(dash.cpl_geral || 0) }].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.bdr}`, fontSize: 12 }}>
                    <span style={{ color: T.tx2 }}>{r.l}</span>
                    <span style={{ color: T.tx, fontWeight: 700 }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
          {dash.resumo && (
            <Section title="Resumo Executivo" icon="📝" T={T}>
              <div style={{ fontSize: 13, lineHeight: 1.8, color: T.tx2, whiteSpace: 'pre-wrap' as const }}>{dash.resumo}</div>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════════════════════ */
export default function DashPage() {
  const params = useParams();
  const code = params?.code as string;
  const [dash, setDash] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (code) load(); }, [code]);

  async function load() {
    const { data } = await supabase.from('client_dashboards').select('*').eq('dash_code', code).single();
    setDash(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#a0a0c0', fontSize: 14 }}>Carregando dashboard...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!dash) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a1a' }}>
      <div style={{ textAlign: 'center', color: '#e8e8f0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Dashboard não encontrado</h1>
        <p style={{ color: '#6b6b90', fontSize: 14 }}>Verifique o link com a agência.</p>
      </div>
    </div>
  );

  const T = themes[(dash.theme as ThemeKey) || 'dark'];
  const template = dash.template || 'simple';
  const dateStr = dash.date_start && dash.date_end
    ? `${new Date(dash.date_start).toLocaleDateString('pt-BR')} — ${new Date(dash.date_end).toLocaleDateString('pt-BR')}`
    : '';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.tx, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* ─── HEADER ─── */}
      <header style={{ background: T.card, borderBottom: `1px solid ${T.bdr}`, padding: '20px 32px', boxShadow: T.shadow }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {dash.logo_url && <img src={dash.logo_url} alt="logo" style={{ height: 40, borderRadius: 8 }} />}
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>{dash.title || 'Dashboard'}</h1>
              {dateStr && <div style={{ fontSize: 12, color: T.tx3, marginTop: 2 }}>{dateStr}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ padding: '6px 14px', background: T.bg3, borderRadius: 8, fontSize: 10, color: T.tx2, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
              {template === 'simple' ? '📊 Simples' : template === 'complete' ? '📈 Completo' : '🚀 Mega'}
            </div>
            <div style={{ fontSize: 11, color: T.tx3 }}>
              Powered by <span style={{ color: T.accent, fontWeight: 700 }}>APR Digital</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── CONTENT ─── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 32px 60px' }}>
        {template === 'simple' && <SimpleTemplate dash={dash} T={T} />}
        {template === 'complete' && <CompleteTemplate dash={dash} T={T} />}
        {template === 'mega' && <MegaTemplate dash={dash} T={T} />}
      </main>

      {/* ─── FOOTER ─── */}
      <footer style={{ textAlign: 'center' as const, padding: '20px 0', borderTop: `1px solid ${T.bdr}`, background: T.card }}>
        <div style={{ fontSize: 11, color: T.tx3 }}>
          📊 Dashboard gerado por <span style={{ color: T.accent, fontWeight: 600 }}>APR Digital</span> • {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
