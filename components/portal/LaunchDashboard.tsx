'use client';
import React, { useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface LaunchPhase {
  name: string;
  description: string;
  investido: number;
  planejado: number;
  dias_no_ar: number;
  impressoes: number;
  cliques: number;
  page_views: number;
  resultados: number;
  resultados_label: string;
  faturado: number;
}

export interface LaunchCreative {
  name: string;
  thumbnail_url?: string;
  preview_url?: string;
  gasto: number;
  compras: number;
  cliques_link: number;
  impressoes: number;
}

export interface SurveyQuestion {
  pergunta: string;
  respostas: { label: string; count: number }[];
}

export interface LaunchDashData {
  orcamento_total: number;
  faturado_ingressos: number;
  faturado_pnp: number;
  phases: LaunchPhase[];
  criativos: LaunchCreative[];
  pesquisa?: { total_respostas: number; perguntas: SurveyQuestion[] };
  checklist?: { item: string; done: boolean }[];
  planejamento?: string;
  debriefing?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fR(v: number) { return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fN(v: number) { return v.toLocaleString('pt-BR'); }
function fP(v: number) { return `${v.toFixed(1)}%`; }
function safe(a: number, b: number) { return b ? a / b : 0; }

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK: LaunchDashData = {
  orcamento_total: 50000,
  faturado_ingressos: 9246,
  faturado_pnp: 0,
  phases: [
    {
      name: 'Fase 01', description: 'Venda de ingressos',
      investido: 6513, planejado: 40000, dias_no_ar: 1,
      impressoes: 44415, cliques: 1300, page_views: 1009,
      resultados: 40, resultados_label: 'ingressos', faturado: 9246,
    },
    {
      name: 'Fase 02', description: 'Remarketing — venda do PNP',
      investido: 0, planejado: 7500, dias_no_ar: 0,
      impressoes: 0, cliques: 0, page_views: 0,
      resultados: 0, resultados_label: 'vendas PNP', faturado: 0,
    },
  ],
  criativos: [
    { name: 'AD08_VIDEO_CURIOSO', gasto: 6363, compras: 55, cliques_link: 1401, impressoes: 40200 },
    { name: 'AD11_VIDEO_NAO_PRECIS', gasto: 4524, compras: 25, cliques_link: 636, impressoes: 33800 },
    { name: 'AD08_VIDEO_CURIOSO_V2', gasto: 1194, compras: 12, cliques_link: 232, impressoes: 20900 },
    { name: 'AD11_VIDEO_NAO_PRECIS_V2', gasto: 2366, compras: 11, cliques_link: 547, impressoes: 22100 },
    { name: 'AD12_VIDEO_4_NOITES', gasto: 886.64, compras: 6, cliques_link: 156, impressoes: 15600 },
  ],
  pesquisa: {
    total_respostas: 83,
    perguntas: [
      { pergunta: 'Profissão', respostas: [{ label: 'Psicólogo', count: 55 }, { label: 'Estudante de psicologia', count: 3 }, { label: 'Terapeuta', count: 8 }, { label: 'Outros', count: 10 }] },
      { pergunta: 'Escolaridade', respostas: [{ label: 'Pós-graduação', count: 47 }, { label: 'Graduação completa', count: 21 }, { label: 'Mestrado', count: 9 }, { label: 'Doutorado', count: 2 }] },
      { pergunta: 'Renda pessoal', respostas: [{ label: 'R$ 6.000 a R$ 10.000/mês', count: 31 }, { label: 'R$ 4.000 a R$ 6.000', count: 16 }, { label: 'R$ 2.000 a R$ 4.000', count: 14 }, { label: 'Acima de R$ 10.000', count: 13 }] },
    ],
  },
  checklist: [
    { item: 'Pixel instalado e disparando', done: true },
    { item: 'UTMs configuradas em todos os anúncios', done: true },
    { item: 'Página de vendas revisada (mobile)', done: true },
    { item: 'Checkout testado ponta a ponta', done: false },
    { item: 'Grupos de WhatsApp criados', done: false },
    { item: 'Sequência de e-mails ativa', done: false },
    { item: 'Criativos aprovados pelo expert', done: true },
    { item: 'Budget distribuído por fase', done: true },
  ],
  planejamento: '',
  debriefing: '',
};

// ─── Sub-tabs ────────────────────────────────────────────────────────────────
type SubTab = 'funil' | 'fases' | 'criativos' | 'pesquisa' | 'planejamento' | 'checklist' | 'debriefing';

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: 'funil', label: 'Funil do Tráfego' },
  { id: 'fases', label: 'Fases' },
  { id: 'criativos', label: 'Criativos' },
  { id: 'pesquisa', label: 'Pesquisa de Perfil' },
  { id: 'planejamento', label: 'Planejamento' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'debriefing', label: 'Debriefing & Resultados' },
];

// ─── KPI Card ────────────────────────────────────────────────────────────────
function Kpi({ label, value, sub, bar, accent }: { label: string; value: string; sub?: string; bar?: number; accent?: boolean }) {
  return (
    <div className="panel" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="small muted" style={{ textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.06em', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--accent)' : '#e2e8f0', lineHeight: 1.1 }}>{value}</div>
      {bar !== undefined && (
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 2 }}>
          <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, bar)}%`, background: 'var(--accent)', transition: 'width 0.4s' }} />
        </div>
      )}
      {sub && <div className="small muted">{sub}</div>}
    </div>
  );
}

// ─── Funil Tab ───────────────────────────────────────────────────────────────
function FunilTab({ d }: { d: LaunchDashData }) {
  const totInv = d.phases.reduce((s, p) => s + p.investido, 0);
  const totImp = d.phases.reduce((s, p) => s + p.impressoes, 0);
  const totCli = d.phases.reduce((s, p) => s + p.cliques, 0);
  const totPV  = d.phases.reduce((s, p) => s + p.page_views, 0);
  const totRes = d.phases.reduce((s, p) => s + p.resultados, 0);
  const totFat = d.faturado_ingressos + d.faturado_pnp;

  const cpm = safe(totInv, totImp) * 1000;
  const cpc = safe(totInv, totCli);
  const custoResult = safe(totInv, totRes);
  const connectRate = safe(totPV, totCli) * 100;
  const convPage = safe(totRes, totPV) * 100;
  const convClick = safe(totRes, totCli) * 100;
  const roasIngresso = safe(d.faturado_ingressos, totInv);
  const roasPnp = safe(d.faturado_pnp, totInv);
  const roasTotal = safe(totFat, totInv);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0 }}>Funil do tráfego pago</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>conectado ao Meta · atualização via planilha</p>
        </div>
      </div>

      <div className="grid g4" style={{ gap: 10, marginBottom: 10 }}>
        <Kpi label="Investido" value={fR(totInv)} bar={safe(totInv, d.orcamento_total) * 100} sub={`orçamento total ${fR(d.orcamento_total)}`} />
        <Kpi label="CPM — Custo por mil" value={fR(cpm)} sub={`${fN(totImp)} impressões`} />
        <Kpi label="CPC — Custo por clique" value={fR(cpc)} sub={`${fN(totCli)} cliques no link`} />
        <Kpi label="Custo por venda de ingresso" value={fR(custoResult)} sub={`${fN(totRes)} ingressos · investimento ${fR(totInv)}`} />
      </div>

      <div className="grid g4" style={{ gap: 10, marginBottom: 10 }}>
        <Kpi label="Connect rate — Cliques → Página" value={fP(connectRate)} bar={connectRate} sub={`${fN(totPV)} visualizações da página`} />
        <Kpi label="Conversão da página" value={fP(convPage)} sub="de quem chegou na página, quantos compraram" />
        <Kpi label="Cliques → Compra" value={fP(convClick)} sub="do clique no anúncio até a compra" />
        <Kpi label="ROAS — Venda de ingressos" value={`${roasIngresso.toFixed(2)}x`} sub={`faturado ${fR(d.faturado_ingressos)} ÷ captação ${fR(totInv)}`} />
      </div>

      <div className="grid g4" style={{ gap: 10 }}>
        <Kpi label="ROAS — Venda do PNP" value={`${roasPnp.toFixed(2)}x`} sub={`faturado ${fR(d.faturado_pnp)} ÷ investimento total ${fR(totInv)}`} />
        <Kpi label="ROAS — Campanha total" value={`${roasTotal.toFixed(2)}x`} accent sub={`faturado ${fR(totFat)} ÷ investimento total ${fR(totInv)}`} />
        <div /><div />
      </div>
    </>
  );
}

// ─── Fases Tab ───────────────────────────────────────────────────────────────
function FasesTab({ d }: { d: LaunchDashData }) {
  const totInv = d.phases.reduce((s, p) => s + p.investido, 0);
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <>
      <h2 style={{ marginBottom: 16 }}>Fases da campanha</h2>

      {/* Phase summary cards */}
      <div className="grid g3" style={{ gap: 12, marginBottom: 24 }}>
        {d.phases.map((p, i) => {
          const pct = totInv ? (p.investido / totInv * 100) : 0;
          const usoPct = p.planejado ? (p.investido / p.planejado * 100) : 0;
          const cpm = safe(p.investido, p.impressoes) * 1000;
          const cpc = safe(p.investido, p.cliques);
          const connRate = safe(p.page_views, p.cliques) * 100;

          return (
            <div key={i} className="panel" style={{ padding: '16px 18px', cursor: 'pointer', border: expanded === i ? '1px solid var(--accent)' : undefined }} onClick={() => setExpanded(expanded === i ? null : i)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{p.name}</span>
                <span className="small muted">{fP(pct)}</span>
              </div>
              <div className="small muted" style={{ marginBottom: 8 }}>{p.description}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>{fR(p.investido)}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${Math.min(100, usoPct)}%`, background: 'var(--accent)' }} />
              </div>
              <div className="small muted" style={{ marginBottom: 8 }}>planejado {fR(p.planejado)} · usou {fP(usoPct)} da verba da fase</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Dias no ar</span><span>{p.dias_no_ar || '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Impressões</span><span>{p.impressoes ? fN(p.impressoes) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Cliques</span><span>{p.cliques ? fN(p.cliques) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Pág. vista</span><span>{p.page_views ? fN(p.page_views) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">CTR</span><span>{p.impressoes ? fP(safe(p.cliques, p.impressoes) * 100) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">CPC</span><span>{p.cliques ? fR(cpc) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">CPM</span><span>{p.impressoes ? fR(cpm) : '—'}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Conn. rate</span><span>{p.cliques ? fP(connRate) : '—'}</span></div>
              </div>

              {p.resultados > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{fN(p.resultados)} {p.resultados_label}</div>
                  <div className="small muted">{fR(safe(p.investido, p.resultados))} por {p.resultados_label.replace(/s$/, '')} · ROAS {safe(p.faturado, p.investido).toFixed(2)}x</div>
                </div>
              )}

              {!p.investido && (
                <div className="small muted" style={{ marginTop: 8, fontStyle: 'italic' }}>Nenhuma campanha desta fase no período.</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded phase detail */}
      {expanded !== null && d.phases[expanded] && d.phases[expanded].investido > 0 && (() => {
        const p = d.phases[expanded];
        const cpm = safe(p.investido, p.impressoes) * 1000;
        const cpc = safe(p.investido, p.cliques);
        const custoRes = safe(p.investido, p.resultados);
        const connRate = safe(p.page_views, p.cliques) * 100;
        const convPage = safe(p.resultados, p.page_views) * 100;
        const usoPct = p.planejado ? (p.investido / p.planejado * 100) : 0;

        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
              <h3 style={{ color: 'var(--accent)', margin: 0 }}>{p.name} — {p.description.toUpperCase()}</h3>
              <span className="small muted">em andamento · {fR(p.investido)} investidos · {p.dias_no_ar} dia(s) no ar</span>
            </div>
            <div className="small muted" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10 }}>Funil da fase</div>
            <div className="grid g3" style={{ gap: 10 }}>
              <Kpi label="Investido na fase" value={fR(p.investido)} bar={usoPct} sub={`planejado ${fR(p.planejado)} · usou ${fP(usoPct)} da verba`} />
              <Kpi label="CPM — Custo por mil" value={fR(cpm)} sub={`${fN(p.impressoes)} impressões`} />
              <Kpi label="CPC — Custo por clique" value={fR(cpc)} sub={`${fN(p.cliques)} cliques no link`} />
              <Kpi label="Custo por resultado" value={fR(custoRes)} sub={`${fN(p.resultados)} ${p.resultados_label} (resultados da campanha)`} />
              <Kpi label="Connect rate — Cliques → Página" value={fP(connRate)} bar={connRate} sub={`${fN(p.page_views)} visualizações da página`} />
              <Kpi label={`Conversão — Página → ${p.resultados_label}`} value={fP(convPage)} sub={`de quem viu a página, quantos compraram`} />
            </div>
          </div>
        );
      })()}
    </>
  );
}

// ─── Criativos Tab ───────────────────────────────────────────────────────────
function CriativosTab({ d }: { d: LaunchDashData }) {
  const [orderBy, setOrderBy] = useState<'compras' | 'roas' | 'ctr'>('compras');
  const sorted = [...d.criativos].sort((a, b) => {
    if (orderBy === 'compras') return b.compras - a.compras;
    if (orderBy === 'roas') return safe(b.compras * safe(d.faturado_ingressos, d.phases.reduce((s, p) => s + p.resultados, 0)), b.gasto) - safe(a.compras * safe(d.faturado_ingressos, d.phases.reduce((s, p) => s + p.resultados, 0)), a.gasto);
    return safe(b.cliques_link, b.impressoes) - safe(a.cliques_link, a.impressoes);
  });

  const best = sorted.slice(0, 5);
  const worst = [...sorted].reverse().slice(0, 5);
  const totalGasto = d.criativos.reduce((s, c) => s + c.gasto, 0);

  function CreativeCard({ c }: { c: LaunchCreative }) {
    const cpc = safe(c.gasto, c.cliques_link);
    const ctr = safe(c.cliques_link, c.impressoes) * 100;
    const cpm = safe(c.gasto, c.impressoes) * 1000;
    const custoCompra = safe(c.gasto, c.compras);

    return (
      <div className="panel" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          {c.thumbnail_url ? (
            <img src={c.thumbnail_url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 48, height: 48, borderRadius: 6, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>▶</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
            <div className="small" style={{ color: 'var(--accent)' }}>Gasto: {fR(c.gasto)}</div>
          </div>
          {c.preview_url && <a href={c.preview_url} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm">abrir prévia ↗</a>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Compras</span><span style={{ fontWeight: 600 }}>{fN(c.compras)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Cliques no link</span><span>{fN(c.cliques_link)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">ROAS</span><span>{c.compras ? `${safe(c.compras * safe(d.faturado_ingressos, d.phases.reduce((s, p) => s + p.resultados, 0)), c.gasto).toFixed(2)}x` : '—'}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Custo por clique</span><span>{fR(cpc)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">CTR</span><span>{fP(ctr)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">CPM</span><span>{fR(cpm)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Custo por compra</span><span>{c.compras ? fR(custoCompra) : '—'}</span></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>Análise de criativos — 5 melhores e 5 piores</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>{d.criativos.length} criativos com gasto no período</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="small muted">Ordenar por</span>
          <select className="input" value={orderBy} onChange={e => setOrderBy(e.target.value as typeof orderBy)} style={{ width: 'auto' }}>
            <option value="compras">Compras</option>
            <option value="roas">ROAS</option>
            <option value="ctr">CTR</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
        <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>FASE 01 — VENDA DE INGRESSOS</span>
        <span className="small muted">{d.criativos.length} criativos · gasto {fR(totalGasto)}</span>
      </div>

      <div className="small muted" style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>5 melhores por {orderBy} (maior é melhor)</div>
      <div className="grid g5" style={{ gap: 10, marginBottom: 24 }}>
        {best.map((c, i) => <CreativeCard key={i} c={c} />)}
      </div>

      <div className="small muted" style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 10 }}>5 piores por {orderBy}</div>
      <div className="grid g5" style={{ gap: 10 }}>
        {worst.map((c, i) => <CreativeCard key={i} c={c} />)}
      </div>
    </>
  );
}

// ─── Pesquisa Tab ────────────────────────────────────────────────────────────
function PesquisaTab({ d }: { d: LaunchDashData }) {
  const pesq = d.pesquisa;
  if (!pesq || pesq.perguntas.length === 0) {
    return (
      <>
        <h2>Pesquisa de perfil</h2>
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="muted">Nenhuma pesquisa conectada ainda.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 style={{ marginBottom: 4 }}>Pesquisas de perfil</h2>
      <p className="small muted" style={{ marginBottom: 20 }}>{pesq.total_respostas} respostas · dados da pesquisa de qualificação dos inscritos</p>

      <div className="small muted" style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>Leitura rápida</div>
      <div className="grid g3" style={{ gap: 10, marginBottom: 28 }}>
        {pesq.perguntas.map((p, i) => {
          const top = p.respostas[0];
          const pct = pesq.total_respostas ? (top.count / pesq.total_respostas * 100) : 0;
          return (
            <div key={i} className="panel" style={{ padding: '16px 18px' }}>
              <div className="small muted" style={{ textTransform: 'uppercase', fontSize: 10, fontWeight: 600, marginBottom: 6 }}>{p.pergunta}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{top.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>{fP(pct)}</div>
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', marginTop: 6 }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: 'var(--accent)' }} />
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>{top.count} de {pesq.total_respostas}</div>
            </div>
          );
        })}
      </div>

      <div className="small muted" style={{ textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12 }}>Compilado por dimensão</div>
      {pesq.perguntas.map((p, pi) => {
        const max = Math.max(...p.respostas.map(r => r.count));
        return (
          <div key={pi} className="panel" style={{ padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <h3 style={{ margin: 0, fontSize: 14 }}>{p.pergunta}</h3>
              <span className="small muted">{p.respostas[0]?.label} {pesq.total_respostas ? fP(p.respostas[0].count / pesq.total_respostas * 100) : '—'}</span>
            </div>
            {p.respostas.map((r, ri) => {
              const pct = pesq.total_respostas ? (r.count / pesq.total_respostas * 100) : 0;
              const barW = max ? (r.count / max * 100) : 0;
              return (
                <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 180, fontSize: 12, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }}>{r.label}</div>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: `${barW}%`, background: 'var(--accent)', transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ width: 70, textAlign: 'right', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{fP(pct)} {r.count}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ─── Checklist Tab ───────────────────────────────────────────────────────────
function ChecklistTab({ d }: { d: LaunchDashData }) {
  const items = d.checklist ?? [];
  const done = items.filter(i => i.done).length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Checklist do lançamento</h2>
        <span className="small muted">{done} de {items.length} concluídos</span>
      </div>

      {items.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="muted">Nenhum item no checklist.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((it, i) => (
            <div key={i} className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${it.done ? 'var(--accent)' : 'rgba(255,255,255,0.15)'}`, background: it.done ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', flexShrink: 0 }}>
                {it.done && '✓'}
              </div>
              <span style={{ fontSize: 13, color: it.done ? 'rgba(255,255,255,0.5)' : '#e2e8f0', textDecoration: it.done ? 'line-through' : 'none' }}>{it.item}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── Text Tab (Planejamento / Debriefing) ────────────────────────────────────
function TextTab({ title, subtitle, content }: { title: string; subtitle: string; content?: string }) {
  return (
    <>
      <h2 style={{ marginBottom: 4 }}>{title}</h2>
      <p className="small muted" style={{ marginBottom: 16 }}>{subtitle}</p>
      {content ? (
        <div className="panel" style={{ padding: '20px 22px', whiteSpace: 'pre-wrap', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{content}</div>
      ) : (
        <div className="panel" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="muted">Nenhum conteúdo adicionado ainda.</p>
        </div>
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function LaunchDashboard({ launchName }: { launchName: string }) {
  const [tab, setTab] = useState<SubTab>('funil');
  const d = MOCK; // Will be replaced with real data from sheet

  return (
    <>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <div className="period">Dashboard do lançamento</div>
          <h1>{launchName}</h1>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="filters" role="group" style={{ marginBottom: 24 }}>
        {SUB_TABS.map(t => (
          <button key={t.id} className="chip" aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'funil' && <FunilTab d={d} />}
      {tab === 'fases' && <FasesTab d={d} />}
      {tab === 'criativos' && <CriativosTab d={d} />}
      {tab === 'pesquisa' && <PesquisaTab d={d} />}
      {tab === 'checklist' && <ChecklistTab d={d} />}
      {tab === 'planejamento' && <TextTab title="Planejamento" subtitle="Estratégia e metas definidas antes do lançamento" content={d.planejamento} />}
      {tab === 'debriefing' && <TextTab title="Debriefing & Resultados" subtitle="Análise pós-lançamento, aprendizados e próximos passos" content={d.debriefing} />}
    </>
  );
}
