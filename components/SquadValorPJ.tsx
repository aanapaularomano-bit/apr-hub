'use client';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Exibição de valor (R$) + seletor de squad
   ------------------------------------------------------------------ */

const T = {
  sand:  '#EFE6D6',
  muted: '#9C8E7B',
  ouro:  '#F0BE4B',
  agua:  '#45D0C4',
};

/* ------------------------------------------------------------------
   Valor em R$ — exibição na tabela
   ------------------------------------------------------------------ */
export function ValorMoeda({
  valor,
  destaque = false,
  tetoDestaque = 5000,
}: {
  valor: number;
  destaque?: boolean;
  tetoDestaque?: number;
}) {
  const n = Number(valor || 0);
  const cor = destaque && n >= tetoDestaque ? T.ouro : T.sand;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ fontSize: 11, color: T.muted }}>R$</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: cor, letterSpacing: '-.01em' }}>
        {n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------
   Squad — cores e rótulos (valores reais do JSONB)
   ------------------------------------------------------------------ */
export const SQUAD_INFO: Record<string, { cor: string; bg: string; label: string }> = {
  'Lançamentos':    { cor: T.ouro,      bg: 'rgba(240,190,75,.12)',   label: 'Lançamentos' },
  'Perpétuo':       { cor: T.agua,      bg: 'rgba(69,208,196,.12)',   label: 'Perpétuo' },
  'Negócios Locais':{ cor: '#A78BFA',   bg: 'rgba(167,139,250,.12)',  label: 'Negócios Locais' },
  'Outros':         { cor: T.muted,     bg: 'rgba(156,142,123,.12)',  label: 'Outros' },
};

export function PillSquad({ squad }: { squad: string }) {
  const sq = SQUAD_INFO[squad] || { cor: T.muted, bg: 'rgba(156,142,123,.12)', label: squad || '—' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: sq.bg, border: `1px solid ${sq.cor}33`, color: sq.cor, borderRadius: 99, padding: '3px 10px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: sq.cor }} />
      {sq.label}
    </span>
  );
}

export function SeletorSquad({ squad, onChange }: { squad: string; onChange: (v: string) => void }) {
  const sq = SQUAD_INFO[squad] || { cor: T.muted, bg: 'rgba(156,142,123,.12)' };
  return (
    <select
      value={squad}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: sq.bg,
        border: `1px solid ${sq.cor}55`,
        color: sq.cor,
        borderRadius: 8,
        padding: '4px 8px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239C8E7B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        paddingRight: 24,
      }}
    >
      {Object.entries(SQUAD_INFO).map(([valor, s]) => (
        <option key={valor} value={valor} style={{ background: '#1D1813', color: s.cor }}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
