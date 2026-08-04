'use client';

import { useState, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Valor (R$) editável direto na tabela + botão de nova receita
   ------------------------------------------------------------------ */

const T = {
  ink: '#14110D',
  surface2: '#262019',
  sand: '#EFE6D6',
  muted: '#9C8E7B',
  ouro: '#F0BE4B',
  agua: '#45D0C4',
  lineSoft: '#2C251E',
};

const fmt = (n: number) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export function EditorValorMoeda({
  valor,
  onChange,
  destaque = false,
  tetoDestaque = 5000,
}: {
  valor: number;
  onChange: (novo: number) => void;
  destaque?: boolean;
  tetoDestaque?: number;
}) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(String(valor ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  const n = Number(valor || 0);
  const cor = destaque && n >= tetoDestaque ? T.ouro : T.sand;

  const confirmar = () => {
    const limpo = temp.replace(/[^\d]/g, '');
    const novo = limpo ? Number(limpo) : 0;
    onChange(novo);
    setEditando(false);
  };

  const cancelar = () => {
    setTemp(String(valor ?? ''));
    setEditando(false);
  };

  if (editando) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: T.surface2, border: `1px solid ${T.agua}`, borderRadius: 7, padding: '3px 8px' }}>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: "'JetBrains Mono', monospace" }}>R$</span>
        <input
          ref={inputRef}
          value={temp}
          onChange={e => setTemp(e.target.value)}
          onBlur={confirmar}
          onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar(); }}
          inputMode="numeric"
          style={{ width: 82, background: 'transparent', border: 'none', outline: 'none', color: T.sand, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, fontSize: 15 }}
        />
      </span>
    );
  }

  return (
    <button
      onClick={() => { setTemp(String(valor ?? '')); setEditando(true); }}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, background: 'transparent', border: '1px solid transparent', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = T.lineSoft; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
      title="Clique para editar"
    >
      <span style={{ fontSize: 11, color: T.muted }}>R$</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: cor, letterSpacing: '-.01em' }}>{fmt(n)}</span>
    </button>
  );
}

/* ------------------------------------------------------------------
   Botão de nova receita — abre uma linha em branco na tabela
   ------------------------------------------------------------------ */
export function BotaoNovaReceita({ onClick, label = 'Novo cliente' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', background: 'transparent', border: `1px dashed ${T.lineSoft}`, borderRadius: 9, padding: '11px 13px', marginTop: 8, color: T.muted, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, cursor: 'pointer', transition: 'border-color .15s ease, color .15s ease' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.agua; e.currentTarget.style.color = T.agua; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.lineSoft; e.currentTarget.style.color = T.muted; }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.3px solid currentColor', display: 'grid', placeItems: 'center', fontSize: 13, lineHeight: 1 }}>+</span>
      {label}
    </button>
  );
}
