'use client';

/* Recebíveis da venda do Rancho (Terras da Barra) — cronograma de 24 parcelas.
   Guardado em apr_financeiro com month_key = RANCHO_KEY. */

export const RANCHO_KEY = 'rancho-terras-da-barra';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mesLabel = (k: string) => { const [y, m] = k.split('-'); return `${MESES[+m - 1]}/${y}`; };

export default function RanchoRecebiveis({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  if (!data) {
    return (
      <section>
        <h2 className="section-title">🏡 Venda do Rancho</h2>
        <p className="section-sub">Cronograma ainda não cadastrado.</p>
      </section>
    );
  }

  const parcelas: any[] = data.parcelas || [];
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const total = parcelas.reduce((s, p) => s + (+p.vendedora || 0), 0);
  const recebido = parcelas.filter(p => p.recebido).reduce((s, p) => s + (+p.vendedora || 0), 0);
  const aReceber = total - recebido;
  const atrasadas = parcelas.filter(p => !p.recebido && p.mes < mesAtual && +p.vendedora > 0);
  const proxima = parcelas.find(p => !p.recebido && p.mes >= mesAtual && +p.vendedora > 0);
  const pct = total > 0 ? (recebido / total) * 100 : 0;

  const porAno: Record<string, { total: number; recebido: number }> = {};
  parcelas.forEach(p => {
    const y = p.mes.slice(0, 4);
    porAno[y] = porAno[y] || { total: 0, recebido: 0 };
    porAno[y].total += +p.vendedora || 0;
    if (p.recebido) porAno[y].recebido += +p.vendedora || 0;
  });

  const upd = (i: number, patch: any) => {
    const novas = parcelas.map((p, j) => (j === i ? { ...p, ...patch } : p));
    onChange({ ...data, parcelas: novas });
  };
  const toggle = (i: number) => {
    const p = parcelas[i];
    upd(i, p.recebido ? { recebido: false, data_recebimento: '' } : { recebido: true, data_recebimento: p.data_recebimento || hoje.toISOString().slice(0, 10) });
  };

  return (
    <section>
      <h2 className="section-title">🏡 Venda do Rancho</h2>
      <p className="section-sub">{data.imovel} · Compradores: {data.compradores}</p>

      <div className="kpi-grid">
        <div className="kpi pf"><div className="kpi-label">Total a receber (você)</div><div className="kpi-value">{fmt(total)}</div><div className="kpi-meta">líquido de ITCMD e honorários · {parcelas.length} parcelas</div></div>
        <div className="kpi"><div className="kpi-label">Já recebido</div><div className="kpi-value pos">{fmt(recebido)}</div><div className="kpi-meta">{parcelas.filter(p => p.recebido).length} parcelas · {pct.toFixed(1)}%</div></div>
        <div className="kpi warn"><div className="kpi-label">Falta receber</div><div className="kpi-value">{fmt(aReceber)}</div><div className="kpi-meta">até {mesLabel(parcelas[parcelas.length - 1]?.mes || mesAtual)}</div></div>
        <div className={`kpi ${atrasadas.length ? 'danger' : ''}`}>
          <div className="kpi-label">{atrasadas.length ? 'Em atraso' : 'Próxima parcela'}</div>
          <div className={`kpi-value ${atrasadas.length ? 'neg' : ''}`}>{atrasadas.length ? fmt(atrasadas.reduce((s, p) => s + +p.vendedora, 0)) : fmt(proxima?.vendedora || 0)}</div>
          <div className="kpi-meta">{atrasadas.length ? atrasadas.map(p => mesLabel(p.mes)).join(', ') : proxima ? mesLabel(proxima.mes) : 'tudo recebido'}</div>
        </div>
      </div>

      <div className="block">
        <div className="block-head"><div className="block-title">Progresso</div><span className="badge pf">{pct.toFixed(1)}% recebido</span></div>
        <div className="block-body">
          <div className="progress" style={{ height: 12 }}><div className="progress-bar" style={{ width: `${pct}%` }} /></div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16, fontSize: 13 }}>
            {Object.entries(porAno).map(([y, v]) => (
              <div key={y}><span style={{ color: 'var(--text-dim)' }}>{y}: </span><strong>{fmt(v.total)}</strong>{v.recebido > 0 && <span style={{ color: 'var(--accent)' }}> · recebido {fmt(v.recebido)}</span>}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="block">
        <div className="block-head">
          <div className="block-title">📅 Cronograma de parcelas</div>
          <span className="badge">Preço {fmt(data.preco_total)} · ITCMD −{fmt(data.itcmd)} · Dr. Luiz {fmt(data.total_dr_luiz)}</span>
        </div>
        <div className="block-body" style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th>Nº</th><th>Vencimento</th><th style={{ textAlign: 'right' }}>Parcela total</th><th style={{ textAlign: 'right' }}>Dr. Luiz</th><th style={{ textAlign: 'right' }}>Você recebe</th><th>Status</th><th>Recebido em</th></tr>
            </thead>
            <tbody>
              {parcelas.map((p, i) => {
                const atrasada = !p.recebido && p.mes < mesAtual && +p.vendedora > 0;
                const atual = p.mes === mesAtual;
                const destaque = +p.vendedora >= 50000;
                return (
                  <tr key={p.n} style={{ background: atual ? 'rgba(200,255,90,.05)' : undefined, opacity: p.recebido ? 0.6 : 1 }}>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>{p.n}</td>
                    <td>
                      {mesLabel(p.mes)}{atual && <span className="badge pj" style={{ marginLeft: 8 }}>este mês</span>}
                      {p.obs && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{p.obs}</div>}
                    </td>
                    <td className="right" style={{ color: 'var(--text-soft)' }}>{fmt(p.total)}</td>
                    <td className="right" style={{ color: 'var(--text-dim)' }}>{+p.dr_luiz ? fmt(p.dr_luiz) : '—'}</td>
                    <td className="right" style={{ fontWeight: destaque ? 700 : 500, color: destaque ? 'var(--accent-2)' : undefined }}>{fmt(p.vendedora)}</td>
                    <td>
                      <button className="btn" onClick={() => toggle(i)} style={{ fontSize: 12, padding: '5px 10px', color: p.recebido ? 'var(--accent)' : atrasada ? 'var(--danger)' : 'var(--text-soft)', borderColor: p.recebido ? 'var(--accent)' : atrasada ? 'var(--danger)' : undefined }}>
                        {p.recebido ? '✓ Recebido' : atrasada ? '⚠ Atrasado' : 'A receber'}
                      </button>
                    </td>
                    <td style={{ width: 150 }}>
                      {p.recebido && <input type="date" value={p.data_recebimento || ''} onChange={e => upd(i, { data_recebimento: e.target.value })} />}
                    </td>
                  </tr>
                );
              })}
              <tr className="total">
                <td colSpan={2}>TOTAL</td>
                <td style={{ textAlign: 'right' }}>{fmt(parcelas.reduce((s, p) => s + +p.total, 0))}</td>
                <td style={{ textAlign: 'right' }}>{fmt(parcelas.reduce((s, p) => s + +p.dr_luiz, 0))}</td>
                <td style={{ textAlign: 'right' }}>{fmt(total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
