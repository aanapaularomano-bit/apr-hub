'use client';

/* ------------------------------------------------------------------
   APR Financeiro — aba PJ APR Digital
   Coluna "Cliente" — avatar com inicial colorida + nome
   ------------------------------------------------------------------ */

const T = { sand: '#EFE6D6', muted: '#9C8E7B' };

const PALETA = [
  '#E8927C', // terracota
  '#7FB88A', // verde-sálvia
  '#8FA8D8', // azul-acinzentado
  '#D4A574', // âmbar
  '#B893C9', // lilás
  '#6FBFB0', // verde-água
  '#D89BAA', // rosa-antigo
  '#A8AE7A', // oliva
];

function hashNome(nome = '') {
  let h = 0;
  for (let i = 0; i < nome.length; i++) {
    h = (h << 5) - h + nome.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function ClienteCelula({ nome, subtitulo }: { nome: string; subtitulo?: string }) {
  const cor = PALETA[hashNome(nome) % PALETA.length];

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 28, height: 28, minWidth: 28, borderRadius: 8, background: `${cor}26`, border: `1px solid ${cor}55`, color: cor, display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-.02em' }}>
        {iniciais(nome)}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{ color: T.sand, fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {nome || '—'}
        </span>
        {subtitulo && (
          <span style={{ color: T.muted, fontSize: 11, marginTop: 1 }}>{subtitulo}</span>
        )}
      </span>
    </span>
  );
}
