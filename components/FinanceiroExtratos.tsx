'use client';

import { useState } from 'react';

/* Extratos bancários do ano (BTG PJ, Inter PJ, Itaú PF) já classificados.
   Guardado em apr_financeiro com month_key = EXTRATOS_KEY. Movimentos automáticos
   (aplicação/resgate da conta remunerada e rendimentos) ficam de fora. */

export const EXTRATOS_KEY = 'extratos-2026';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const mesLabel = (k: string) => { const [y, m] = k.split('-'); return `${MESES[+m - 1]}/${y.slice(2)}`; };

export const GRUPOS: { id: string; nome: string; cor: string; cats: string[]; ajuda: string }[] = [
  { id: 'receita', nome: 'Receita do negócio', cor: '#22C55E', cats: ['Clientes', 'Plataformas (comissões)'], ajuda: 'clientes e comissões de plataformas' },
  { id: 'negocio', nome: 'Custos do negócio', cor: '#7cb7ff', cats: ['Equipe e freelas', 'Ferramentas e tráfego', 'Impostos', 'Parceiros e terceiros'], ajuda: 'equipe, ferramentas, impostos e parceiros' },
  { id: 'pessoal', nome: 'Gastos pessoais', cor: '#ff6b8a', cats: ['Cartões de crédito', 'Carro (compra/financiamento)', 'Moradia e contas da casa', 'Lazer, viagem e pessoal', 'Saúde e seguros', 'Outros gastos', 'Bloqueio judicial'], ajuda: 'cartões, carro, casa, lazer e saúde' },
  { id: 'dividas', nome: 'Parcelas de empréstimos', cor: '#ffb454', cats: ['Empréstimos pagos'], ajuda: 'BNDES e outros' },
  { id: 'extras', nome: 'Dinheiro extra', cor: '#c8ff5a', cats: ['Venda do rancho', 'Empréstimos recebidos', 'Família'], ajuda: 'rancho, empréstimos e família' },
  { id: 'contas', nome: 'Entre suas contas', cor: '#9b9bb0', cats: ['Entre suas contas'], ajuda: 'transferências para contas e investimentos fora destes extratos' },
];
const TODAS_CATS = GRUPOS.flatMap(g => g.cats);
const grupoDe = (cat: string) => GRUPOS.find(g => g.cats.includes(cat))?.id || 'pessoal';

export default function FinanceiroExtratos({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [fMes, setFMes] = useState('');
  const [fCat, setFCat] = useState('');
  const [fConta, setFConta] = useState('');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(100);

  if (!data) {
    return (
      <section>
        <h2 className="section-title">🏦 Extratos</h2>
        <p className="section-sub">Nenhum extrato importado ainda.</p>
      </section>
    );
  }

  const tx: any[] = data.tx || [];
  const meses = Array.from(new Set(tx.map(t => t.data.slice(0, 7)))).sort();
  const nMeses = meses.length || 1;

  const porMes: Record<string, Record<string, number>> = {};
  const porCat: Record<string, number> = {};
  tx.forEach(t => {
    const m = t.data.slice(0, 7);
    const g = grupoDe(t.cat);
    porMes[m] ||= {};
    porMes[m][g] = (porMes[m][g] || 0) + t.valor;
    porCat[t.cat] = (porCat[t.cat] || 0) + t.valor;
  });
  const totG = (g: string) => meses.reduce((s, m) => s + (porMes[m]?.[g] || 0), 0);
  const receita = totG('receita');
  const negocio = totG('negocio');
  const pessoal = totG('pessoal');
  const dividas = totG('dividas');
  const extras = totG('extras');
  const contas = totG('contas');
  const lucroNegocio = receita + negocio;
  const sobra = lucroNegocio + pessoal + dividas;

  // Gargalos calculados a partir dos números
  const cartoes = -(porCat['Cartões de crédito'] || 0);
  const emprestimos = porCat['Empréstimos recebidos'] || 0;
  const impostos = -(porCat['Impostos'] || 0);
  const carro = -(porCat['Carro (compra/financiamento)'] || 0);
  const bloqueio = -(porCat['Bloqueio judicial'] || 0);
  const gargalos: { nivel: 'danger' | 'warn' | 'info'; titulo: string; texto: string }[] = [];
  if (sobra < 0) gargalos.push({ nivel: 'danger', titulo: 'A vida pessoal gasta mais do que o negócio lucra', texto: `O negócio deixou ${fmt(lucroNegocio)} no período (${fmt(lucroNegocio / nMeses)}/mês), mas gastos pessoais e parcelas somaram ${fmt(-(pessoal + dividas))} (${fmt(-(pessoal + dividas) / nMeses)}/mês). A diferença de ${fmt(-sobra)} foi coberta com venda do rancho, empréstimos e família.` });
  if (cartoes > 0) gargalos.push({ nivel: cartoes / nMeses > 15000 ? 'danger' : 'warn', titulo: `Cartões: ${fmt(cartoes / nMeses)} por mês`, texto: `${fmt(cartoes)} pagos em faturas no período, ${receita ? Math.round((cartoes / receita) * 100) : 0}% de tudo que o negócio faturou. É o maior gasto do ano.` });
  if (emprestimos > 0) gargalos.push({ nivel: 'danger', titulo: `${fmt(emprestimos)} em empréstimos no ano`, texto: 'Os crediários do Itaú (set e out) entraram no mesmo dia em que faturas do cartão foram pagas: empréstimo para pagar cartão. Isso cria juros em cima de juros.' });
  if (receita > 0) gargalos.push({ nivel: impostos / receita < 0.06 ? 'warn' : 'info', titulo: `Impostos: ${fmt(impostos)} (${((impostos / receita) * 100).toFixed(1)}% da receita)`, texto: 'Valor baixo para o faturamento. Confirmar com o contador se o Simples está sendo pago sobre tudo que entra, para não virar dívida com a Receita.' });
  if (carro > 0) gargalos.push({ nivel: 'warn', titulo: `Carro: ${fmt(carro)} no ano`, texto: 'Entrada do carro novo em outubro paga com o dinheiro do rancho, mais as parcelas do financiamento ao longo do ano.' });
  if (bloqueio > 0) gargalos.push({ nivel: 'danger', titulo: `Bloqueio judicial na conta PF (${fmt(bloqueio)})`, texto: 'Houve bloqueios em abril e maio. Vale entender a origem com o advogado para não se repetir.' });
  if (contas < 0) gargalos.push({ nivel: 'info', titulo: `${fmt(-contas)} saíram para contas fora destes extratos`, texto: 'Transferências para outra conta da APR Digital e para contas PF em outros bancos. Provavelmente investimentos. Confirmar o destino.' });

  // Lançamentos filtrados
  const filtrados = tx
    .map((t, i) => ({ ...t, i }))
    .filter(t => (!fMes || t.data.startsWith(fMes)) && (!fCat || t.cat === fCat) && (!fConta || t.conta === fConta) && (!busca || t.desc.toLowerCase().includes(busca.toLowerCase())))
    .sort((a, b) => b.data.localeCompare(a.data));
  const somaFiltro = filtrados.reduce((s, t) => s + t.valor, 0);

  const mudarCat = (i: number, cat: string) => {
    const novo = { ...data, tx: tx.map((t, j) => (j === i ? { ...t, cat } : t)) };
    onChange(novo);
  };

  const kpi = (label: string, valor: number, meta: string, cor: string) => (
    <div className="kpi"><div className="kpi-label">{label}</div><div className="kpi-value" style={{ color: cor }}>{fmt(valor)}</div><div className="kpi-meta">{meta}</div></div>
  );
  const sel = { background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit' } as const;
  const mono = { fontFamily: 'JetBrains Mono,monospace' } as const;

  return (
    <section>
      <h2 className="section-title">🏦 Extratos {data.periodo?.slice(0, 4)}</h2>
      <p className="section-sub">O que realmente entrou e saiu das contas · {data.periodo?.split(' a ').map((d: string) => d.split('-').reverse().join('/')).join(' a ')}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(data.contas || []).map((c: any) => (
          <span key={c.nome} style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: 'var(--text-soft)' }}>
            {c.nome} · saldo {fmt(c.saldo_ini)} → <b style={{ color: 'var(--text)' }}>{fmt(c.saldo_fim)}</b>
          </span>
        ))}
      </div>

      <div className="kpi-grid">
        {kpi('Receita do negócio', receita, `${fmt(receita / nMeses)} por mês`, '#22C55E')}
        {kpi('Custos do negócio', -negocio, `${fmt(-negocio / nMeses)} por mês`, 'var(--info)')}
        {kpi('Lucro do negócio', lucroNegocio, `${fmt(lucroNegocio / nMeses)} por mês`, 'var(--accent)')}
        {kpi('Gastos pessoais + parcelas', -(pessoal + dividas), `${fmt(-(pessoal + dividas) / nMeses)} por mês`, 'var(--danger)')}
        {kpi('Sobra (lucro − pessoal)', sobra, sobra < 0 ? 'faltou dinheiro: coberto por extras' : 'sobrou no período', sobra < 0 ? 'var(--danger)' : 'var(--accent)')}
        {kpi('Dinheiro extra', extras, 'rancho, empréstimos, família', 'var(--warn)')}
      </div>

      <div className="block">
        <div className="block-head"><div className="block-title">⚠ Gargalos</div></div>
        <div className="block-body">
          <div className="alerts">
            {gargalos.map((g, i) => (
              <div key={i} className={`alert ${g.nivel}`}>
                <div className="alert-icon">{g.nivel === 'danger' ? '⛔' : g.nivel === 'warn' ? '⚠' : 'ℹ'}</div>
                <div className="alert-body"><strong>{g.titulo}</strong><span>{g.texto}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="block">
        <div className="block-head"><div className="block-title">🗓 Mês a mês</div></div>
        <div className="block-body" style={{ overflowX: 'auto' }}>
          <table style={{ minWidth: 760 }}>
            <thead>
              <tr>
                <th>Mês</th>
                <th style={{ textAlign: 'right' }}>Receita</th>
                <th style={{ textAlign: 'right' }}>Custos negócio</th>
                <th style={{ textAlign: 'right' }}>Lucro negócio</th>
                <th style={{ textAlign: 'right' }}>Pessoal + parcelas</th>
                <th style={{ textAlign: 'right' }}>Sobra</th>
                <th style={{ textAlign: 'right' }}>Extras</th>
              </tr>
            </thead>
            <tbody>
              {meses.map(m => {
                const v = (g: string) => porMes[m]?.[g] || 0;
                const luc = v('receita') + v('negocio');
                const sob = luc + v('pessoal') + v('dividas');
                return (
                  <tr key={m} style={{ cursor: 'pointer' }} onClick={() => setFMes(fMes === m ? '' : m)} title="Clique para ver os lançamentos do mês">
                    <td style={{ fontWeight: fMes === m ? 700 : 400 }}>{mesLabel(m)}</td>
                    <td style={{ ...mono, textAlign: 'right' }}>{fmt(v('receita'))}</td>
                    <td style={{ ...mono, textAlign: 'right' }}>{fmt(-v('negocio'))}</td>
                    <td style={{ ...mono, textAlign: 'right' }}>{fmt(luc)}</td>
                    <td style={{ ...mono, textAlign: 'right' }}>{fmt(-(v('pessoal') + v('dividas')))}</td>
                    <td style={{ ...mono, textAlign: 'right', color: sob < 0 ? 'var(--danger)' : 'var(--accent)' }}>{fmt(sob)}</td>
                    <td style={{ ...mono, textAlign: 'right', color: 'var(--text-soft)' }}>{v('extras') ? fmt(v('extras')) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="two-col">
        {GRUPOS.filter(g => ['negocio', 'pessoal'].includes(g.id)).map(g => {
          const itens = g.cats.map(c => ({ c, v: -(porCat[c] || 0) })).filter(x => x.v > 0).sort((a, b) => b.v - a.v);
          const max = Math.max(1, ...itens.map(x => x.v));
          return (
            <div className="block" key={g.id}>
              <div className="block-head"><div className="block-title">{g.id === 'pessoal' ? '🏠' : '💼'} {g.nome}</div></div>
              <div className="block-body">
                {itens.map(x => (
                  <div key={x.c} style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => setFCat(fCat === x.c ? '' : x.c)} title="Clique para ver os lançamentos">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 8 }}>
                      <span style={{ fontWeight: fCat === x.c ? 700 : 400 }}>{x.c}</span>
                      <span style={mono}>{fmt(x.v)} · {fmt(x.v / nMeses)}/mês</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 99 }}>
                      <div style={{ width: `${(x.v / max) * 100}%`, height: '100%', background: g.cor, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="block">
        <div className="block-head">
          <div className="block-title">📄 Lançamentos</div>
          <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{filtrados.length} lançamentos · <span style={mono}>{fmt(somaFiltro)}</span></div>
        </div>
        <div className="block-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <select value={fMes} onChange={e => setFMes(e.target.value)} style={sel}>
              <option value="">Todos os meses</option>
              {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
            </select>
            <select value={fCat} onChange={e => setFCat(e.target.value)} style={sel}>
              <option value="">Todas as categorias</option>
              {GRUPOS.map(g => <optgroup key={g.id} label={g.nome}>{g.cats.map(c => <option key={c} value={c}>{c}</option>)}</optgroup>)}
            </select>
            <select value={fConta} onChange={e => setFConta(e.target.value)} style={sel}>
              <option value="">Todas as contas</option>
              {(data.contas || []).map((c: any) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
            </select>
            <input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ ...sel, flex: '1 1 160px' }} />
          </div>
          {filtrados.slice(0, limite).map(t => (
            <div key={t.i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.desc}>{t.desc}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.data.split('-').reverse().join('/')} · {t.conta}</div>
              </div>
              <select value={t.cat} onChange={e => mudarCat(t.i, e.target.value)} style={{ ...sel, fontSize: 11, padding: '4px 6px' }}>
                {TODAS_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{ ...mono, minWidth: 100, textAlign: 'right', color: t.valor >= 0 ? '#22C55E' : 'var(--text)' }}>{fmt(t.valor)}</span>
            </div>
          ))}
          {filtrados.length > limite && (
            <button className="btn" style={{ marginTop: 12 }} onClick={() => setLimite(limite + 200)}>Mostrar mais ({filtrados.length - limite})</button>
          )}
        </div>
      </div>
    </section>
  );
}
