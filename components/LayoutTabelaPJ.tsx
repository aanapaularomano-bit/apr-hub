'use client';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Ajuste de layout: sem ícones decorativos, fontes maiores,
   espaçamento consistente entre as colunas.

   Substitui: ClienteCelula (de ClienteAvatarPJ) e
   DiaPagamento (de DiaPagamentoPJ).
   ------------------------------------------------------------------ */

const T = {
  sand: '#EFE6D6',
  muted: '#9C8E7B',
  agua: '#45D0C4',
  lineSoft: '#2C251E',
};

const setaSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239C8E7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")";

/* ------------------------------------------------------------------
   Cliente — só o nome, sem avatar/símbolo.
   ------------------------------------------------------------------ */
export function ClienteCelula({ nome }: { nome: string }) {
  return (
    <span style={{ color: T.sand, fontSize: 16, fontWeight: 600, letterSpacing: '-.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {nome || '—'}
    </span>
  );
}

/* ------------------------------------------------------------------
   Dia de pagamento — sem ícone de calendário, select editável.
   ------------------------------------------------------------------ */
export function SeletorDiaPagamento({ dia, onChange }: { dia: string | number | null | undefined; onChange: (v: number | null) => void }) {
  const semData = !dia || Number(dia) < 1;
  const valor = semData ? '' : String(Number(dia));

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {!semData && <span style={{ fontSize: 14, color: T.muted }}>todo dia</span>}
      <select
        value={valor}
        onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{ background: 'transparent', border: '1px solid transparent', color: semData ? T.muted : T.sand, fontFamily: semData ? 'inherit' : "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 14, padding: '4px 22px 4px 7px', borderRadius: 7, cursor: 'pointer', appearance: 'none', backgroundImage: setaSvg, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 5px center', transition: 'background .15s ease, border-color .15s ease' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.05)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        onFocus={e => (e.currentTarget.style.borderColor = `${T.agua}55`)}
        onBlur={e => (e.currentTarget.style.borderColor = 'transparent')}
      >
        <option value="" style={{ background: '#1D1813', color: T.muted }}>Sem data definida</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map(n => (
          <option key={n} value={n} style={{ background: '#1D1813', color: T.sand }}>{n}</option>
        ))}
      </select>
    </span>
  );
}

/* ------------------------------------------------------------------
   Estilos consistentes para <th> e <td> da tabela de receitas PJ.
   ------------------------------------------------------------------ */
export const ESTILO_TABELA = {
  cabecalho: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '.08em',
    textTransform: 'uppercase' as const,
    color: T.muted,
    padding: '10px 14px',
    textAlign: 'left' as const,
    borderBottom: `1px solid ${T.lineSoft}`,
    whiteSpace: 'nowrap' as const,
  },
  celula: {
    padding: '16px 14px',
    fontSize: 14,
    verticalAlign: 'middle' as const,
    borderBottom: `1px solid ${T.lineSoft}`,
  },
  linha: {
    transition: 'background .12s ease',
  },
};
