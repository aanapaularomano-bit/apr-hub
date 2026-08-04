'use client';

import { useState, useRef, useEffect } from 'react';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   1) Grid de colunas com largura fixa (cabeçalho e linhas alinhados)
   2) Nome do cliente editável, mesmo padrão de clique do valor
   ------------------------------------------------------------------ */

const T = {
  surface2: '#262019',
  sand: '#EFE6D6',
  muted: '#9C8E7B',
  agua: '#45D0C4',
  lineSoft: '#2C251E',
};

/* ------------------------------------------------------------------
   Larguras das colunas — a MESMA constante usada no cabeçalho e em
   cada linha, senão elas descolam uma da outra.
   ------------------------------------------------------------------ */
export const GRID_COLUNAS = 'minmax(160px, 2.2fr) 150px 160px 150px 130px 110px 36px';

export const ESTILO_TABELA = {
  linhaGrid: {
    display: 'grid',
    gridTemplateColumns: GRID_COLUNAS,
    alignItems: 'center',
    columnGap: 24,
  } as React.CSSProperties,
  cabecalho: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '.07em',
    textTransform: 'uppercase' as const,
    color: T.muted,
    padding: '12px 4px',
    borderBottom: `1px solid ${T.lineSoft}`,
    whiteSpace: 'nowrap' as const,
  },
  celula: {
    padding: '16px 4px',
    fontSize: 15,
    borderBottom: `1px solid ${T.lineSoft}`,
  },
};

/* ------------------------------------------------------------------
   Cabeçalho da tabela — usar uma vez acima das linhas de cada grupo.
   ------------------------------------------------------------------ */
export function CabecalhoTabela() {
  const cols = ['Cliente', 'Squad', 'Status', 'Dia pgto', 'Valor (R$)', 'Recebido?', ''];
  return (
    <div style={ESTILO_TABELA.linhaGrid}>
      {cols.map((c, i) => (
        <div key={i} style={ESTILO_TABELA.cabecalho}>{c}</div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------
   Nome do cliente — clicável e editável, mesmo gesto do valor.
   ------------------------------------------------------------------ */
export function ClienteEditavel({ nome, onChange }: { nome: string; onChange: (v: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [temp, setTemp] = useState(nome || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  const confirmar = () => {
    const limpo = temp.trim();
    onChange(limpo || nome || '');
    setEditando(false);
  };

  const cancelar = () => {
    setTemp(nome || '');
    setEditando(false);
  };

  if (editando) {
    return (
      <input
        ref={inputRef}
        value={temp}
        onChange={e => setTemp(e.target.value)}
        onBlur={confirmar}
        onKeyDown={e => { if (e.key === 'Enter') confirmar(); if (e.key === 'Escape') cancelar(); }}
        style={{ width: '100%', background: T.surface2, border: `1px solid ${T.agua}`, borderRadius: 7, padding: '6px 9px', color: T.sand, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', outline: 'none' }}
      />
    );
  }

  return (
    <button
      onClick={() => { setTemp(nome || ''); setEditando(true); }}
      title="Clique para editar"
      style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: '1px solid transparent', borderRadius: 7, padding: '6px 9px', margin: '-6px -9px', color: T.sand, fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.05)'; e.currentTarget.style.borderColor = T.lineSoft; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      {nome || '— clique para nomear —'}
    </button>
  );
}
