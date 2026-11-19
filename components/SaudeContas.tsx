'use client';

import { useEffect, useMemo, useState } from 'react';

// Saúde das contas de anúncio — dados lidos direto do gerenciador da Meta via /api/saude-contas.

interface Res { gasto: number; leads: number; conversas: number; compras: number; total: number }
interface Conta {
  id: string; nome: string; bm: string; moeda: string; status: string;
  nivel: 'ok' | 'critico' | 'atencao' | 'fechada';
  pagamento: string; ontem: Res; semana: Res; gasto30: number;
  alertas: { nivel: 'critico' | 'atencao'; texto: string }[];
  link: string; pagamentoLink: string;
}

const RED = '#ef4444';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';

const money = (n: number, moeda: string) => {
  try { return (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: moeda || 'BRL', maximumFractionDigits: 2 }); }
  catch { return (moeda || '') + ' ' + (n || 0).toFixed(2); }
};

const resTexto = (r: Res) => {
  const p: string[] = [];
  if (r.leads) p.push(r.leads + ' lead' + (r.leads > 1 ? 's' : ''));
  if (r.conversas) p.push(r.conversas + ' conversa' + (r.conversas > 1 ? 's' : ''));
  if (r.compras) p.push(r.compras + ' compra' + (r.compras > 1 ? 's' : ''));
  return p.length ? p.join(' · ') : '—';
};

type Filtro = 'alertas' | 'ativas' | 'todas';

export default function SaudeContas({ T }: { T: any }) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [quando, setQuando] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('alertas');
  const [busca, setBusca] = useState('');

  const carregar = async () => {
    setCarregando(true); setErro('');
    try {
      const r = await fetch('/api/saude-contas', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro ao carregar');
      setContas(j.contas || []);
      setQuando(j.atualizadoEm || '');
    } catch (e: any) {
      setErro(e.message || String(e));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const criticas = contas.filter(c => c.alertas.some(a => a.nivel === 'critico'));
  const atencao = contas.filter(c => c.alertas.length && !c.alertas.some(a => a.nivel === 'critico'));
  const rodando = contas.filter(c => c.nivel === 'ok' && c.ontem.gasto > 0);
  const gastoOntemBRL = contas.filter(c => c.moeda === 'BRL').reduce((s, c) => s + c.ontem.gasto, 0);
  const outrasMoedas = Array.from(new Set(contas.filter(c => c.moeda !== 'BRL' && c.ontem.gasto > 0).map(c => c.moeda)));

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let l = contas;
    if (filtro === 'alertas') l = l.filter(c => c.alertas.length);
    if (filtro === 'ativas') l = l.filter(c => c.nivel !== 'fechada' && c.gasto30 > 0);
    if (q) l = l.filter(c => (c.nome + ' ' + c.bm + ' ' + c.id).toLowerCase().includes(q));
    const peso = (c: Conta) => c.alertas.some(a => a.nivel === 'critico') ? 0 : c.alertas.length ? 1 : c.nivel === 'fechada' ? 3 : 2;
    return [...l].sort((a, b) => peso(a) - peso(b) || b.ontem.gasto - a.ontem.gasto || a.nome.localeCompare(b.nome));
  }, [contas, filtro, busca]);

  const card = { background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: '14px 16px' };
  const kpi = (rotulo: string, valor: string | number, cor: string, sub?: string) => (
    <div style={{ ...card, flex: '1 1 180px' }}>
      <div style={{ fontSize: 12, color: T.mt, fontWeight: 600 }}>{rotulo}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: cor, marginTop: 4 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: T.mt2, marginTop: 2 }}>{sub}</div>}
    </div>
  );
  const chip = (ativo: boolean) => ({
    padding: '7px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
    border: '1px solid ' + (ativo ? 'rgba(99,102,241,0.4)' : T.bdr),
    background: ativo ? 'rgba(99,102,241,0.12)' : 'transparent', color: ativo ? '#a5b4fc' : T.mt,
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🩺 Saúde das contas</h1>
          <div style={{ fontSize: 13, color: T.mt, marginTop: 4 }}>
            Direto do gerenciador da Meta · {quando ? 'atualizado às ' + new Date(quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'carregando…'}
          </div>
        </div>
        <button onClick={carregar} disabled={carregando} style={{ ...chip(false), opacity: carregando ? 0.5 : 1 }}>
          {carregando ? 'Atualizando…' : '↻ Atualizar'}
        </button>
      </div>

      {erro && (
        <div style={{ ...card, borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5', marginBottom: 16 }}>
          Não consegui ler a Meta: {erro}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        {kpi('Problema grave', criticas.length, criticas.length ? RED : T.tx, 'pagamento, conta desativada, saldo zerado')}
        {kpi('Precisa de atenção', atencao.length, atencao.length ? AMBER : T.tx, 'sem resultado, parou de gastar, saldo baixo')}
        {kpi('Rodando ontem', rodando.length, GREEN, `de ${contas.length} contas visíveis`)}
        {kpi('Investido ontem (R$)', money(gastoOntemBRL, 'BRL'), T.tx, outrasMoedas.length ? 'fora contas em ' + outrasMoedas.join(', ') : 'só contas em reais')}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button style={chip(filtro === 'alertas')} onClick={() => setFiltro('alertas')}>Com alerta ({criticas.length + atencao.length})</button>
        <button style={chip(filtro === 'ativas')} onClick={() => setFiltro('ativas')}>Gastaram nos últimos 30 dias</button>
        <button style={chip(filtro === 'todas')} onClick={() => setFiltro('todas')}>Todas ({contas.length})</button>
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conta ou cliente…"
          style={{ flex: '1 1 200px', minWidth: 160, padding: '8px 12px', borderRadius: 8, border: '1px solid ' + T.bdr, background: 'transparent', color: T.tx, fontSize: 13 }} />
      </div>

      {!carregando && !erro && lista.length === 0 && (
        <div style={{ ...card, color: T.mt }}>{filtro === 'alertas' ? 'Nenhuma conta com alerta agora. 🎉' : 'Nenhuma conta encontrada.'}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lista.map(c => {
          const grave = c.alertas.some(a => a.nivel === 'critico');
          const borda = grave ? RED : c.alertas.length ? AMBER : 'transparent';
          return (
            <div key={c.id} style={{ ...card, borderLeft: '3px solid ' + borda, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', opacity: c.nivel === 'fechada' ? 0.55 : 1 }}>
              <div style={{ flex: '2 1 260px', minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: T.mt2, marginTop: 2 }}>
                  {c.status}{c.bm ? ' · ' + c.bm : ''} · act_{c.id}
                </div>
                {c.alertas.map((a, i) => (
                  <div key={i} style={{ fontSize: 13, fontWeight: 600, marginTop: 6, color: a.nivel === 'critico' ? '#fca5a5' : '#fcd34d' }}>
                    {a.nivel === 'critico' ? '⛔ ' : '⚠️ '}{a.texto}
                  </div>
                ))}
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <div style={{ fontSize: 11, color: T.mt2, fontWeight: 600 }}>ONTEM</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{money(c.ontem.gasto, c.moeda)}</div>
                <div style={{ fontSize: 12, color: T.mt }}>{resTexto(c.ontem)}</div>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <div style={{ fontSize: 11, color: T.mt2, fontWeight: 600 }}>7 DIAS</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{money(c.semana.gasto, c.moeda)}</div>
                <div style={{ fontSize: 12, color: T.mt }}>{resTexto(c.semana)}</div>
              </div>
              <div style={{ flex: '1 1 170px', fontSize: 12, color: T.mt }}>
                <div style={{ fontSize: 11, color: T.mt2, fontWeight: 600 }}>PAGAMENTO</div>
                {c.pagamento || '—'}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <a href={c.link} target="_blank" rel="noreferrer" style={{ ...chip(false), textDecoration: 'none' }}>Gerenciador ↗</a>
                {(grave || /pagamento|saldo|carência/i.test(c.alertas.map(a => a.texto).join(' '))) && (
                  <a href={c.pagamentoLink} target="_blank" rel="noreferrer" style={{ ...chip(false), textDecoration: 'none', color: '#fca5a5' }}>Pagamento ↗</a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
