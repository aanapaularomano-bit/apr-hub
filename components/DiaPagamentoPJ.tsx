'use client';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Exibição do "Dia pgto" — de número solto pra frase legível
   ------------------------------------------------------------------ */

const T = { sand: '#EFE6D6', muted: '#9C8E7B' };

function IconeCalendario({ cor }: { cor: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" stroke={cor} strokeWidth="1.3" />
      <path d="M2 6.5h12" stroke={cor} strokeWidth="1.3" />
      <path d="M5.5 1.5v3M10.5 1.5v3" stroke={cor} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function DiaPagamento({ dia }: { dia: string | number }) {
  const n = Number(dia);
  const semData = !dia || Number.isNaN(n) || n < 1;

  if (semData) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.muted, fontSize: 13 }}>
        <IconeCalendario cor={T.muted} />
        Sem data definida
      </span>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.sand, fontSize: 13 }}>
      <IconeCalendario cor={T.muted} />
      <span style={{ color: T.muted }}>todo dia</span>{' '}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 13 }}>{n}</span>
    </span>
  );
}
