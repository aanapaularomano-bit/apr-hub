'use client';
import { useState, useEffect, useCallback } from 'react';

const ENTITY_LABELS: Record<string, string> = {
  activity: 'Atividade', daily_report: 'Diário', weekly_report: 'Semanal',
  monthly_report: 'Mensal', optimization: 'Otimização', content: 'Conteúdo',
  request: 'Solicitação', link: 'Link', launch: 'Lançamento', launch_phase: 'Fase',
};

const ACTION_COLORS: Record<string, string> = {
  create: '#22c55e', update: '#60a5fa', delete: '#ef4444',
  publish: '#a78bfa', unpublish: '#94a3b8', status: '#f59e0b',
};

const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

function fmtDt(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistorySection({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    let url = `/api/portal/manage?client_id=${clientId}&section=history`;
    if (filterEntity) url += `&entity=${filterEntity}`;
    if (filterFrom) url += `&from=${filterFrom}`;
    if (filterTo) url += `&to=${filterTo}`;
    const d = await fetch(url).then(r => r.json());
    setItems(d.logs || []);
    setPage(0);
    setLoading(false);
  }, [clientId, filterEntity, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  const paged = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(items.length / PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} style={{ ...inp, width: 160, fontSize: 12 }}>
          <option value="">Todos os tipos</option>
          {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inp, width: 140, fontSize: 12 }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>até</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ ...inp, width: 140, fontSize: 12 }} />
        </div>
        {(filterEntity || filterFrom || filterTo) && (
          <button onClick={() => { setFilterEntity(''); setFilterFrom(''); setFilterTo(''); }} style={btnG}>Limpar</button>
        )}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{items.length} registro{items.length !== 1 ? 's' : ''}</span>
      </div>

      {loading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>}

      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '32px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>Nenhum registro no histórico.</p>
        </div>
      )}

      {paged.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['Data/Hora', 'Tipo', 'Ação', 'Campo', 'Valor anterior', 'Novo valor', 'Autor'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left' as const, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' as const }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((log, i) => (
                <tr key={log.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' as const, fontSize: 11, fontFamily: 'monospace' }}>{fmtDt(log.created_at)}</td>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.6)' }}>{ENTITY_LABELS[log.entity] || log.entity}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: `${ACTION_COLORS[log.action] || '#94a3b8'}20`, color: ACTION_COLORS[log.action] || '#94a3b8' }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{log.field || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{log.old_value || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.6)', fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{log.new_value || '—'}</td>
                  <td style={{ padding: '8px 12px', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{log.actor || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ ...btnG, opacity: page === 0 ? 0.4 : 1 }}>Anterior</button>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Página {page + 1} de {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ ...btnG, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Próxima</button>
        </div>
      )}
    </div>
  );
}
