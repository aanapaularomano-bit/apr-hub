'use client';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Status de recebimento + faixa de resumo do mês
   ------------------------------------------------------------------ */

export const STATUS = {
  recebido: { cor: '#22C55E', bg: 'rgba(34,197,94,.12)', label: 'Recebido' },
  aReceber: { cor: '#F0BE4B', bg: 'rgba(240,190,75,.12)', label: 'A receber' },
  atrasado: { cor: '#EF4444', bg: 'rgba(239,68,68,.12)', label: 'Em atraso' },
  previsto: { cor: '#6B7280', bg: 'rgba(107,114,128,.12)', label: 'Previsto' },
};

type StatusChave = keyof typeof STATUS;

export interface StatusResult {
  cor: string;
  bg: string;
  label: string;
  chave: StatusChave;
  texto: string;
  dias?: number;
}

export function statusRecebimento(
  recebido: boolean,
  diaPgto: string | number,
  mesRef: Date
): StatusResult {
  if (recebido) return { ...STATUS.recebido, chave: 'recebido', texto: 'Recebido' };

  const hoje = new Date();
  const dia = Number(diaPgto) || 1;
  const venc = new Date(mesRef.getFullYear(), mesRef.getMonth(), dia);

  const d0 = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dias = Math.floor((d0.getTime() - venc.getTime()) / 86400000);

  if (dias > 0) {
    return {
      ...STATUS.atrasado,
      chave: 'atrasado',
      texto: `Atrasado · ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      dias,
    };
  }
  if (venc > d0 && (venc.getMonth() !== d0.getMonth() || venc.getFullYear() !== d0.getFullYear())) {
    return { ...STATUS.previsto, chave: 'previsto', texto: 'Previsto' };
  }
  return { ...STATUS.aReceber, chave: 'aReceber', texto: `A receber · dia ${dia}` };
}

const brl = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

/* ------------------------------------------------------------------
   Faixa de resumo — vai no topo da aba PJ, acima da tabela
   receitas: [{ cliente, valor, recebido, diaPgto }]
   mesRef:   Date do primeiro dia do mês exibido
   ------------------------------------------------------------------ */
interface Receita {
  cliente?: string;
  valor: number;
  recebido: boolean;
  diaPgto: string | number;
}

export function ResumoRecebimentos({
  receitas = [],
  mesRef = new Date(),
}: {
  receitas: Receita[];
  mesRef: Date;
}) {
  const totais: Record<StatusChave, number> = { recebido: 0, aReceber: 0, atrasado: 0, previsto: 0 };
  const contagem: Record<StatusChave, number> = { recebido: 0, aReceber: 0, atrasado: 0, previsto: 0 };

  receitas.forEach((r) => {
    const st = statusRecebimento(r.recebido, r.diaPgto, mesRef);
    totais[st.chave] += Number(r.valor || 0);
    contagem[st.chave] += 1;
  });

  const total = Object.values(totais).reduce((a, b) => a + b, 0);
  const cards = [
    { chave: 'recebido' as StatusChave, ...STATUS.recebido },
    { chave: 'aReceber' as StatusChave, ...STATUS.aReceber },
    { chave: 'atrasado' as StatusChave, ...STATUS.atrasado },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {cards.map((c) => (
          <div
            key={c.chave}
            style={{ background: c.bg, border: `1px solid ${c.cor}33`, borderRadius: 12, padding: '14px 16px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: c.cor, flexShrink: 0 }} />
              <span style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: c.cor, fontWeight: 600 }}>
                {c.label}
              </span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: c.cor, lineHeight: 1.1 }}>
              {brl(totais[c.chave])}
            </div>
            <div style={{ fontSize: 12, color: '#8A8B92', marginTop: 4 }}>
              {contagem[c.chave]} {contagem[c.chave] === 1 ? 'cliente' : 'clientes'}
            </div>
          </div>
        ))}
      </div>

      {total > 0 && (
        <div style={{ display: 'flex', height: 6, borderRadius: 99, overflow: 'hidden', marginTop: 12, background: 'rgba(255,255,255,.06)' }}>
          {cards.map((c) =>
            totais[c.chave] > 0 ? (
              <div
                key={c.chave}
                style={{ width: `${(totais[c.chave] / total) * 100}%`, background: c.cor }}
                title={`${c.label}: ${brl(totais[c.chave])}`}
              />
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------
   Pill de status — vai na coluna "Recebido" de cada linha
   ------------------------------------------------------------------ */
export function PillStatus({
  recebido,
  diaPgto,
  mesRef,
}: {
  recebido: boolean;
  diaPgto: string | number;
  mesRef: Date;
}) {
  const st = statusRecebimento(recebido, diaPgto, mesRef);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: st.bg,
        border: `1px solid ${st.cor}33`,
        color: st.cor,
        borderRadius: 99,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: st.cor }} />
      {st.texto}
    </span>
  );
}
