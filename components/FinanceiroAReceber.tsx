'use client';

import { useState } from 'react';

/* A receber — junta as receitas PJ não recebidas de TODOS os meses num lugar só.
   Antes, ao copiar o mês, a pendência antiga ficava escondida no mês velho. */

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const fmt = (n: number) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const nrm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const mesLabel = (k: string) => { const [y, m] = k.split('-'); return `${MESES[+m - 1]}/${y.slice(2)}`; };

// Régua de cobrança por dias de atraso
function acaoCobranca(dias: number) {
  if (dias <= 0) return { txt: 'Ainda no prazo', cor: 'var(--text-dim)' };
  if (dias <= 5) return { txt: 'Lembrete gentil no WhatsApp', cor: '#F0BE4B' };
  if (dias <= 15) return { txt: 'Cobrar e mandar link de pagamento', cor: '#F0BE4B' };
  if (dias <= 30) return { txt: 'Ligar e avisar que as entregas pausam', cor: '#FF8A4C' };
  return { txt: 'Pausar entregas e propor acordo', cor: 'var(--danger)' };
}

type Item = { monthKey: string; idx: number; cliente: string; valor: number; dias: number; venc: Date; status: string };

export default function FinanceiroAReceber({ db, eurRate, onMarcarRecebido }: {
  db: Record<string, any>;
  eurRate: number;
  onMarcarRecebido: (monthKey: string, idx: number) => void;
}) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const hoje = new Date();
  const d0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const itens: Item[] = [];
  Object.keys(db).filter(k => /^\d{4}-\d{2}$/.test(k) && k <= mesAtual).forEach(k => {
    const [y, m] = k.split('-').map(Number);
    (db[k]?.['rec-pj'] || []).forEach((r: any, idx: number) => {
      const valor = (parseFloat(r.valor) || 0) * (r.moeda === 'EUR' ? eurRate : 1);
      if (r.recebido || valor <= 0) return;
      // Sem dia de pagamento: considera o último dia do mês
      const dia = Number(r.dia) || new Date(y, m, 0).getDate();
      const venc = new Date(y, m - 1, dia);
      const dias = Math.floor((d0.getTime() - venc.getTime()) / 86400000);
      itens.push({ monthKey: k, idx, cliente: (r.cliente || 'Sem nome').trim(), valor, dias, venc, status: r.status || 'Ativo' });
    });
  });

  const atrasados = itens.filter(i => i.dias > 0);
  const aVencer = itens.filter(i => i.dias <= 0);
  const totalAtraso = atrasados.reduce((s, i) => s + i.valor, 0);
  const totalAVencer = aVencer.reduce((s, i) => s + i.valor, 0);
  const mais30 = atrasados.filter(i => i.dias > 30).reduce((s, i) => s + i.valor, 0);

  const grupos = Object.values(atrasados.reduce((acc: Record<string, { cliente: string; itens: Item[] }>, i) => {
    const key = nrm(i.cliente);
    (acc[key] ||= { cliente: i.cliente, itens: [] }).itens.push(i);
    return acc;
  }, {})).map(g => ({
    ...g,
    total: g.itens.reduce((s, i) => s + i.valor, 0),
    maxDias: Math.max(...g.itens.map(i => i.dias)),
    itens: g.itens.sort((a, b) => b.dias - a.dias),
  })).sort((a, b) => b.maxDias - a.maxDias || b.total - a.total);

  const copiarMensagem = (g: typeof grupos[number]) => {
    const linhas = g.itens.map(i => `• ${mesLabel(i.monthKey)}: ${fmt(i.valor)}`).join('\n');
    const plural = g.itens.length > 1;
    const msg = `Oi! Tudo bem? Passando para avisar que ${plural ? 'constam em aberto estes pagamentos' : 'consta em aberto este pagamento'}:\n${linhas}\n${plural ? `Total: ${fmt(g.total)}\n` : ''}\nConsegue me mandar o comprovante ou a previsão de pagamento? Obrigada!`;
    navigator.clipboard?.writeText(msg).then(() => {
      setCopiado(g.cliente);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  const kpi = (label: string, valor: string, meta: string, cor: string) => (
    <div className="kpi"><div className="kpi-label">{label}</div><div className="kpi-value" style={{ color: cor }}>{valor}</div><div className="kpi-meta">{meta}</div></div>
  );

  return (
    <section>
      <h2 className="section-title">A receber</h2>
      <p className="section-sub">Tudo que os clientes ainda não pagaram, somando todos os meses</p>

      <div className="kpi-grid">
        {kpi('Em atraso', fmt(totalAtraso), `${grupos.length} ${grupos.length === 1 ? 'cliente' : 'clientes'}`, 'var(--danger)')}
        {kpi('Atraso acima de 30 dias', fmt(mais30), 'risco de não receber', '#FF8A4C')}
        {kpi('A vencer este mês', fmt(totalAVencer), `${aVencer.length} lançamentos`, 'var(--warn)')}
      </div>

      <div className="block">
        <div className="block-head"><div className="block-title">💸 Quem está devendo</div></div>
        <div className="block-body">
          {grupos.length === 0 && <div className="empty">Nenhum pagamento atrasado. 🎉</div>}
          {grupos.map(g => {
            const acao = acaoCobranca(g.maxDias);
            return (
              <div key={g.cliente} style={{ border: '1px solid var(--line)', borderLeft: `3px solid ${acao.cor}`, borderRadius: 10, padding: 14, marginBottom: 12, background: 'var(--bg-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{g.cliente}</div>
                    <div style={{ fontSize: 12, color: acao.cor, marginTop: 4 }}>{g.maxDias} dias de atraso · {acao.txt}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 18, fontWeight: 600 }}>{fmt(g.total)}</div>
                    <button className="btn" style={{ marginTop: 6, fontSize: 12 }} onClick={() => copiarMensagem(g)}>
                      {copiado === g.cliente ? '✓ Copiado' : '📋 Copiar cobrança'}
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  {g.itens.map(i => (
                    <div key={i.monthKey + i.idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--line-soft)', fontSize: 13, gap: 8 }}>
                      <span style={{ color: 'var(--text-soft)' }}>{mesLabel(i.monthKey)} · venceu {i.venc.toLocaleDateString('pt-BR')} · {i.dias}d</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmt(i.valor)}</span>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-dim)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={false} onChange={() => onMarcarRecebido(i.monthKey, i.idx)} style={{ accentColor: '#22C55E' }} />
                          recebido
                        </label>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {aVencer.length > 0 && (
        <div className="block">
          <div className="block-head"><div className="block-title">📅 A vencer este mês</div></div>
          <div className="block-body">
            {aVencer.sort((a, b) => a.venc.getTime() - b.venc.getTime()).map(i => (
              <div key={i.monthKey + i.idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--line-soft)', fontSize: 13, gap: 8 }}>
                <span>{i.cliente} <span style={{ color: 'var(--text-dim)' }}>· dia {i.venc.getDate()}</span></span>
                <span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmt(i.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
