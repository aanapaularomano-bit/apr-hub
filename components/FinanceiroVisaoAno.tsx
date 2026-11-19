'use client';

import { useState } from 'react';

/* Visão do ano — junta todos os meses de um ano: faturamento PJ, recebido x em aberto,
   custos, squads, clientes que entraram/saíram e maiores clientes. */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : String(Math.round(n));
const nrm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const COR_RECEBIDO = '#22C55E';
const COR_ABERTO = '#F0BE4B';

type Mes = {
  key: string; i: number; existe: boolean;
  fat: number; recebido: number; aberto: number; custos: number;
  clientes: Map<string, { nome: string; valor: number }>;
  squads: Record<string, number>;
  entraram: string[]; sairam: string[]; comparavel: boolean;
};

export default function FinanceiroVisaoAno({ db, eurRate }: { db: Record<string, any>; eurRate: number }) {
  const anos = Array.from(new Set(Object.keys(db).filter(k => /^\d{4}-\d{2}$/.test(k)).map(k => k.slice(0, 4)))).sort();
  const [ano, setAno] = useState(anos.includes(String(new Date().getFullYear())) ? String(new Date().getFullYear()) : anos[anos.length - 1] || String(new Date().getFullYear()));
  const [hover, setHover] = useState<number | null>(null);

  const toBRL = (r: any) => (parseFloat(r.valor) || 0) * (r.moeda === 'EUR' ? eurRate : 1);
  const sum = (arr: any[]) => (arr || []).reduce((s: number, r: any) => s + toBRL(r), 0);

  const meses: Mes[] = MESES.map((_, i) => {
    const key = `${ano}-${String(i + 1).padStart(2, '0')}`;
    const d = db[key];
    const clientes = new Map<string, { nome: string; valor: number }>();
    const squads: Record<string, number> = {};
    let fat = 0, recebido = 0;
    (d?.['rec-pj'] || []).forEach((r: any) => {
      const v = toBRL(r);
      if (v <= 0) return;
      fat += v;
      if (r.recebido) recebido += v;
      const nome = (r.cliente || 'Sem nome').trim();
      const c = clientes.get(nrm(nome));
      clientes.set(nrm(nome), { nome, valor: (c?.valor || 0) + v });
      const sq = r.squad || 'Sem squad';
      squads[sq] = (squads[sq] || 0) + v;
    });
    const custos = d ? sum(d['cust-pj']) + sum(d['var-pj']) : 0;
    return { key, i, existe: !!d, fat, recebido, aberto: fat - recebido, custos, clientes, squads, entraram: [], sairam: [], comparavel: false };
  });

  // Entradas e saídas: só compara com o mês imediatamente anterior, quando ele existe
  meses.forEach((m, i) => {
    const prevKey = i === 0 ? `${+ano - 1}-12` : meses[i - 1].key;
    const prevD = i === 0 ? db[prevKey] : (meses[i - 1].existe ? db[prevKey] : null);
    if (!m.existe || !prevD) return;
    const prev = new Set<string>((prevD['rec-pj'] || []).filter((r: any) => toBRL(r) > 0).map((r: any) => nrm(r.cliente)));
    m.comparavel = true;
    m.entraram = Array.from(m.clientes.entries()).filter(([k]) => !prev.has(k)).map(([, c]) => c.nome);
    const atuais = new Set(m.clientes.keys());
    m.sairam = (prevD['rec-pj'] || []).filter((r: any) => toBRL(r) > 0 && !atuais.has(nrm(r.cliente))).map((r: any) => (r.cliente || '').trim());
  });

  const comDados = meses.filter(m => m.existe && m.fat > 0);
  const semDados = meses.filter(m => !m.existe && m.key <= `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  const totalAno = comDados.reduce((s, m) => s + m.fat, 0);
  const recebidoAno = comDados.reduce((s, m) => s + m.recebido, 0);
  const abertoAno = comDados.reduce((s, m) => s + m.aberto, 0);
  const custosAno = comDados.reduce((s, m) => s + m.custos, 0);
  const media = comDados.length ? totalAno / comDados.length : 0;
  const melhor = comDados.reduce<Mes | null>((b, m) => (!b || m.fat > b.fat ? m : b), null);
  const pior = comDados.reduce<Mes | null>((b, m) => (!b || m.fat < b.fat ? m : b), null);
  const maxFat = Math.max(1, ...meses.map(m => m.fat));

  const squadsAno: Record<string, number> = {};
  comDados.forEach(m => Object.entries(m.squads).forEach(([k, v]) => { squadsAno[k] = (squadsAno[k] || 0) + v; }));
  const squadsOrd = Object.entries(squadsAno).sort((a, b) => b[1] - a[1]);

  const clientesAno = new Map<string, { nome: string; total: number; meses: number }>();
  comDados.forEach(m => m.clientes.forEach((c, k) => {
    const cur = clientesAno.get(k);
    clientesAno.set(k, { nome: c.nome, total: (cur?.total || 0) + c.valor, meses: (cur?.meses || 0) + 1 });
  }));
  const top = Array.from(clientesAno.values()).sort((a, b) => b.total - a.total).slice(0, 10);

  // Gráfico
  const W = 720, H = 240, padL = 8, padB = 28, padT = 22;
  const slot = (W - padL * 2) / 12;
  const barW = Math.min(36, slot - 12);
  const y = (v: number) => (H - padB) - (v / maxFat) * (H - padB - padT);

  const kpi = (label: string, valor: string, meta: string, cls = '') => (
    <div className={`kpi ${cls}`}><div className="kpi-label">{label}</div><div className="kpi-value">{valor}</div><div className="kpi-meta">{meta}</div></div>
  );

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 className="section-title">Visão do ano</h2>
          <p className="section-sub">Faturamento PJ mês a mês, quem paga, quem entrou e quem saiu</p>
        </div>
        <div className="month-picker">
          <span>📅</span>
          <select value={ano} onChange={e => setAno(e.target.value)}>
            {anos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {semDados.length > 0 && (
        <div className="alert warn" style={{ marginBottom: 16 }}>
          <div className="alert-icon">⚠</div>
          <div className="alert-body"><strong>Meses sem dados: {semDados.map(m => MESES[m.i]).join(', ')}</strong><span>Os totais do ano consideram só os {comDados.length} meses preenchidos.</span></div>
        </div>
      )}

      <div className="kpi-grid">
        {kpi(`Faturamento ${ano}`, fmt(totalAno), `${comDados.length} meses com dados`)}
        {kpi('Média por mês', fmt(media), melhor && pior ? `melhor ${MESES[melhor.i]} ${fmtK(melhor.fat)} · pior ${MESES[pior.i]} ${fmtK(pior.fat)}` : '—')}
        {kpi('Recebido', fmt(recebidoAno), totalAno ? `${Math.round((recebidoAno / totalAno) * 100)}% do faturado` : '—')}
        {kpi('Em aberto', fmt(abertoAno), 'ver aba A receber', 'warn')}
        {kpi('Custos PJ lançados', fmt(custosAno), 'imposto ainda não entra aqui', 'danger')}
      </div>

      <div className="block">
        <div className="block-head">
          <div className="block-title">📊 Faturamento por mês</div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--text-soft)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COR_RECEBIDO }} />Recebido</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: COR_ABERTO }} />Em aberto</span>
          </div>
        </div>
        <div className="block-body" style={{ position: 'relative' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`Faturamento por mês em ${ano}`}>
            <line x1={padL} x2={W - padL} y1={H - padB} y2={H - padB} stroke="var(--line)" />
            {meses.map(m => {
              const cx = padL + slot * m.i + slot / 2;
              const x = cx - barW / 2;
              const ativo = hover === m.i;
              return (
                <g key={m.key} onMouseEnter={() => setHover(m.i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
                  <rect x={padL + slot * m.i} y={padT - 10} width={slot} height={H - padT - padB + 10} fill={ativo ? 'rgba(255,255,255,.04)' : 'transparent'} />
                  {!m.existe ? (
                    <text x={cx} y={H - padB - 8} textAnchor="middle" fontSize="10" fill="var(--text-dim)">sem dados</text>
                  ) : (
                    <>
                      {m.recebido > 0 && <rect x={x} y={y(m.recebido)} width={barW} height={(H - padB) - y(m.recebido)} rx={3} fill={COR_RECEBIDO} />}
                      {m.aberto > 0 && <rect x={x} y={y(m.fat)} width={barW} height={Math.max(0, y(m.recebido) - y(m.fat) - 2)} rx={3} fill={COR_ABERTO} />}
                      <text x={cx} y={y(m.fat) - 6} textAnchor="middle" fontSize="11" fill="var(--text-soft)" fontFamily="JetBrains Mono,monospace">{fmtK(m.fat)}</text>
                    </>
                  )}
                  <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill={ativo ? 'var(--text)' : 'var(--text-dim)'}>{MESES[m.i]}</text>
                </g>
              );
            })}
          </svg>
          {hover !== null && meses[hover].existe && (
            <div style={{ position: 'absolute', top: 8, left: `${Math.min(70, Math.max(2, ((hover + 0.5) / 12) * 100 - 12))}%`, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', fontSize: 12, pointerEvents: 'none', minWidth: 170 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{MESES[hover]}/{ano}</div>
              <div>Faturado: <b>{fmt(meses[hover].fat)}</b></div>
              <div style={{ color: 'var(--text-soft)' }}>Recebido: {fmt(meses[hover].recebido)}</div>
              <div style={{ color: 'var(--text-soft)' }}>Em aberto: {fmt(meses[hover].aberto)}</div>
              <div style={{ color: 'var(--text-soft)' }}>{meses[hover].clientes.size} clientes</div>
            </div>
          )}
        </div>
      </div>

      <div className="block">
        <div className="block-head"><div className="block-title">🗓 Mês a mês</div></div>
        <div className="block-body" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th>Mês</th><th style={{ textAlign: 'right' }}>Faturado</th><th style={{ textAlign: 'right' }}>Recebido</th><th style={{ textAlign: 'right' }}>Em aberto</th><th style={{ textAlign: 'right' }}>Custos PJ</th><th style={{ textAlign: 'right' }}>Clientes</th><th>Entraram</th><th>Saíram</th>
              </tr>
            </thead>
            <tbody>
              {meses.filter(m => m.existe).map(m => (
                <tr key={m.key}>
                  <td>{MESES[m.i]}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(m.fat)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(m.recebido)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono,monospace', color: m.aberto > 0 ? 'var(--warn)' : undefined }}>{fmt(m.aberto)}</td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(m.custos)}</td>
                  <td style={{ textAlign: 'right' }}>{m.clientes.size}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-soft)', maxWidth: 220 }} title={m.entraram.join(', ')}>{m.comparavel ? (m.entraram.length ? `+${m.entraram.length} · ${m.entraram.slice(0, 3).join(', ')}${m.entraram.length > 3 ? '…' : ''}` : '—') : 'mês anterior sem dados'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-soft)', maxWidth: 220 }} title={m.sairam.join(', ')}>{m.comparavel ? (m.sairam.length ? `−${m.sairam.length} · ${m.sairam.slice(0, 3).join(', ')}${m.sairam.length > 3 ? '…' : ''}` : '—') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        <div className="block">
          <div className="block-head"><div className="block-title">🧩 Faturamento por squad</div></div>
          <div className="block-body">
            {squadsOrd.map(([sq, v]) => (
              <div key={sq} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{sq}</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmt(v)} · {totalAno ? Math.round((v / totalAno) * 100) : 0}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 99 }}>
                  <div style={{ width: `${totalAno ? (v / totalAno) * 100 : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                </div>
              </div>
            ))}
            {squadsAno['Sem squad'] > 0 && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>“Sem squad” = meses em que o squad não foi preenchido.</div>}
          </div>
        </div>

        <div className="block">
          <div className="block-head"><div className="block-title">🏆 Maiores clientes do ano</div></div>
          <div className="block-body">
            {top.map((c, i) => (
              <div key={c.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13, gap: 8 }}>
                <span><span style={{ color: 'var(--text-dim)', marginRight: 6 }}>{i + 1}.</span>{c.nome} <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>· {c.meses} {c.meses === 1 ? 'mês' : 'meses'}</span></span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmt(c.total)}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>O mesmo cliente com nomes diferentes em meses diferentes aparece separado.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
