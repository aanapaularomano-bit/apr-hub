'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { SQUADS } from '@/lib/constants';
import { computeAutoAlerts, type AutoAlert } from '@/lib/alertRules';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  clients: any[];
  tasks: any[];
  T: any;
  onOpenClient: (c: any) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fB = (n: number) =>
  'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fB2 = (n: number) =>
  'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fN = (n: number) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3
    ? (n / 1e3).toFixed(1) + 'K'
    : String(Math.round(n || 0));

const SG = "'Space Grotesk', 'DM Sans', system-ui, sans-serif";
const FR = "'Fraunces', Georgia, serif";
const JM = "'JetBrains Mono', monospace";
const GREEN = '#22c55e';
const NEON  = '#4ade80';

// ─── 7-day split from daily_data ──────────────────────────────────────────────
function get7d(dailyData: any[]): {
  curr: { leads: number; investimento: number };
  prev: { leads: number; investimento: number };
} {
  if (!Array.isArray(dailyData) || dailyData.length === 0) {
    return { curr: { leads: 0, investimento: 0 }, prev: { leads: 0, investimento: 0 } };
  }
  const slice = dailyData.slice(-14);
  const sum = (arr: any[]) =>
    arr.reduce(
      (a, d) => ({ leads: a.leads + (d.leads || 0), investimento: a.investimento + (d.investimento || 0) }),
      { leads: 0, investimento: 0 }
    );
  return { curr: sum(slice.slice(-7)), prev: sum(slice.slice(0, 7)) };
}

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusDot({ status, lastSync }: { status: string; lastSync: string | null }) {
  const stale = lastSync && Date.now() - new Date(lastSync).getTime() > 2 * 24 * 60 * 60 * 1000;
  const color =
    status !== 'ativo' ? '#64748b'
    : !lastSync       ? '#ef4444'
    : stale           ? '#f59e0b'
    :                   GREEN;
  const label =
    status !== 'ativo' ? 'Pausado'
    : !lastSync        ? 'Sem dados'
    : stale            ? 'Desatualizado'
    :                    'Ativo';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div
        style={{
          width: 7, height: 7, borderRadius: '50%', background: color,
          boxShadow: color === GREEN ? `0 0 6px ${color}` : 'none',
        }}
      />
      <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );
}

function DeltaChip({ pct, inverse = false }: { pct: number | null; inverse?: boolean }) {
  if (pct === null || Math.abs(pct) < 0.5)
    return <span style={{ color: '#475569', fontSize: 10 }}>—</span>;
  const up = pct > 0;
  const good = inverse ? !up : up;
  return (
    <span style={{ color: good ? GREEN : '#ef4444', fontSize: 10, fontWeight: 700 }}>
      {up ? '↑' : '↓'}{Math.abs(pct).toFixed(0)}%
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function CentralDeControle({ clients, tasks, T, onOpenClient }: Props) {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [squadFilter, setSquadFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [alertFilter, setAlertFilter] = useState('todos');
  const [search, setSearch] = useState('');

  // ── Data fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('client_dashboards')
      .select('*')
      .then(({ data }) => {
        setDashboards(data || []);
        setLoading(false);
      });
  }, []);

  // ── Computed data ───────────────────────────────────────────────────────────
  const active = useMemo(() => clients.filter(c => c.status === 'ativo'), [clients]);

  const dashMap = useMemo(
    () => Object.fromEntries(dashboards.map(d => [d.client_id, d])),
    [dashboards]
  );

  // Auto alerts from rules engine
  const autoAlerts = useMemo(
    () => computeAutoAlerts(active, dashboards),
    [active, dashboards]
  );

  // Manual alerts from client_alerts (joined on clients in HubApp)
  const manualAlerts = useMemo<AutoAlert[]>(
    () =>
      active.flatMap(c =>
        ((c.client_alerts || []) as any[])
          .filter(a => !a.resolved)
          .map(a => ({
            clientId: c.id,
            clientName: c.name,
            severity: (a.type === 'error' ? 'critico' : 'atencao') as AutoAlert['severity'],
            rule: 'manual',
            message: a.message,
            action: '',
          }))
      ),
    [active]
  );

  // Merged + sorted alerts
  const allAlerts = useMemo<AutoAlert[]>(() => {
    const seen = new Set<string>();
    const merged: AutoAlert[] = [];
    for (const a of [...autoAlerts, ...manualAlerts]) {
      const key = `${a.clientId}-${a.rule}-${a.message}`;
      if (!seen.has(key)) { seen.add(key); merged.push(a); }
    }
    return merged.sort((a, b) => {
      if (a.severity === 'critico' && b.severity !== 'critico') return -1;
      if (a.severity !== 'critico' && b.severity === 'critico') return 1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [autoAlerts, manualAlerts]);

  // Per-client alert index
  const alertsByClient = useMemo(() => {
    const map: Record<string, AutoAlert[]> = {};
    for (const a of allAlerts) {
      if (!map[a.clientId]) map[a.clientId] = [];
      map[a.clientId].push(a);
    }
    return map;
  }, [allAlerts]);

  // Macro totals (7-day window)
  const macro = useMemo(() => {
    let invest7d = 0, leads7d = 0, roasWeight = 0, roasInvest = 0, campanhasAtivas = 0;
    for (const c of active) {
      const dash = dashMap[c.id];
      if (!dash) continue;
      const { curr } = get7d(dash.daily_data || []);
      invest7d  += curr.investimento;
      leads7d   += curr.leads;
      if (dash.roas > 0 && curr.investimento > 0) {
        roasWeight += dash.roas * curr.investimento;
        roasInvest += curr.investimento;
      }
      const synced = dash.last_sync &&
        Date.now() - new Date(dash.last_sync).getTime() < 2 * 24 * 60 * 60 * 1000;
      if (synced) campanhasAtivas++;
    }
    return {
      invest7d,
      leads7d,
      roasMedio: roasInvest > 0 ? roasWeight / roasInvest : 0,
      campanhasAtivas,
      criticalCount: allAlerts.filter(a => a.severity === 'critico').length,
      atencaoCount: allAlerts.filter(a => a.severity === 'atencao').length,
    };
  }, [active, dashMap, allAlerts]);

  // Displayed alerts (respects alertFilter)
  const displayedAlerts = useMemo(() => {
    if (alertFilter === 'critico') return allAlerts.filter(a => a.severity === 'critico');
    if (alertFilter === 'atencao') return allAlerts.filter(a => a.severity === 'atencao');
    return allAlerts;
  }, [allAlerts, alertFilter]);

  // Filtered clients
  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (squadFilter !== 'todos' && c.squad !== squadFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      const dash = dashMap[c.id];
      if (statusFilter === 'ativo' && c.status !== 'ativo') return false;
      if (statusFilter === 'pausado' && c.status !== 'pausado') return false;
      if (statusFilter === 'sem_dados' && (dash?.last_sync)) return false;
      const alerts = alertsByClient[c.id] || [];
      if (alertFilter === 'critico' && !alerts.some(a => a.severity === 'critico')) return false;
      if (alertFilter === 'atencao' && !alerts.some(a => a.severity === 'atencao')) return false;
      return true;
    });
  }, [clients, squadFilter, statusFilter, alertFilter, search, dashMap, alertsByClient]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: SG }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: T.tx, fontFamily: SG }}>
            Central de Controle
          </h1>
          <span style={{ fontFamily: FR, fontSize: 14, color: NEON, fontStyle: 'italic' }}>
            visao geral
          </span>
        </div>
        <p style={{ fontSize: 13, color: T.mt, margin: 0 }}>
          {active.length} clientes ativos
          {!loading && ` · ${Object.keys(dashMap).length} dashboards configurados`}
          {macro.criticalCount > 0 && (
            <span style={{ color: '#fca5a5', fontWeight: 700 }}>
              {' '}· {macro.criticalCount} alerta{macro.criticalCount > 1 ? 's' : ''} critico{macro.criticalCount > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>

      {/* ── Macro Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Investido 7d',     value: fB(macro.invest7d),                               color: '#a78bfa' },
          { label: 'Leads 7d',         value: fN(macro.leads7d),                                color: '#38bdf8' },
          { label: 'ROAS medio',       value: macro.roasMedio > 0 ? macro.roasMedio.toFixed(2) + 'x' : '—', color: GREEN },
          { label: 'Ativas (sync ok)', value: String(macro.campanhasAtivas),                    color: '#f59e0b' },
          {
            label: 'Alertas criticos',
            value: String(macro.criticalCount),
            color: macro.criticalCount > 0 ? '#ef4444' : GREEN,
          },
        ].map(k => (
          <div
            key={k.label}
            style={{
              background: T.card,
              border: `1px solid ${k.label === 'Alertas criticos' && macro.criticalCount > 0 ? 'rgba(239,68,68,0.25)' : T.bdr}`,
              borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: k.color, opacity: 0.5 }} />
            <div style={{ fontSize: 10, color: T.mt, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: JM, color: k.color }}>
              {loading ? '…' : k.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          style={{
            padding: '8px 14px', background: T.card,
            border: `1px solid ${T.bdr}`, borderRadius: 10,
            color: T.tx, fontSize: 13, outline: 'none', width: 200,
          }}
        />
        <FilterGroup
          options={[['todos','Todos'],['lancamentos','Lancamentos'],['perpetuo','Perpetuo'],['negocios_locais','Locais']]}
          value={squadFilter}
          onChange={setSquadFilter}
          T={T}
        />
        <FilterGroup
          options={[['todos','Todos'],['ativo','Ativo'],['pausado','Pausado'],['sem_dados','Sem dados']]}
          value={statusFilter}
          onChange={setStatusFilter}
          T={T}
        />
        <FilterGroup
          options={[['todos','Todos'],['critico','Critico'],['atencao','Atencao']]}
          value={alertFilter}
          onChange={setAlertFilter}
          T={T}
        />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.mt }}>
          {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Main layout: Alert panel + Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

        {/* Alert panel */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${allAlerts.length > 0 ? 'rgba(239,68,68,0.15)' : T.bdr}`,
            borderRadius: 14, padding: '16px 18px',
            position: 'sticky' as const, top: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: T.tx, fontFamily: SG }}>Alertas</span>
            {macro.criticalCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '2px 8px', borderRadius: 20 }}>
                {macro.criticalCount} critico{macro.criticalCount > 1 ? 's' : ''}
              </span>
            )}
            {macro.atencaoCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.12)', color: '#fde68a', padding: '2px 8px', borderRadius: 20 }}>
                {macro.atencaoCount} atencao
              </span>
            )}
          </div>

          {displayedAlerts.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '24px 0', color: T.mt }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
              <div style={{ fontSize: 13 }}>Nenhum alerta</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, maxHeight: 560, overflowY: 'auto' as const }}>
              {displayedAlerts.map((a, i) => (
                <AlertCard
                  key={`${a.clientId}-${a.rule}-${i}`}
                  alert={a}
                  onClick={() => {
                    const c = clients.find(cl => cl.id === a.clientId);
                    if (c) onOpenClient(c);
                  }}
                />
              ))}
            </div>
          )}

          {allAlerts.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${T.bdr}`, fontSize: 11, color: T.mt }}>
              Clique em um alerta para abrir o cliente
            </div>
          )}
        </div>

        {/* Client cards grid */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: T.mt }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div>Carregando dashboards...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: 40, color: T.mt }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 15 }}>Nenhum cliente encontrado</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
              {filtered.map(c => (
                <ClientCard
                  key={c.id}
                  client={c}
                  dash={dashMap[c.id] || null}
                  clientAlerts={alertsByClient[c.id] || []}
                  tasks={tasks}
                  T={T}
                  onClick={() => onOpenClient(c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AlertCard ────────────────────────────────────────────────────────────────
function AlertCard({ alert: a, onClick }: { alert: AutoAlert; onClick: () => void }) {
  const critico = a.severity === 'critico';
  return (
    <div
      onClick={onClick}
      style={{
        background: critico ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.04)',
        border: `1px solid ${critico ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.14)'}`,
        borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
        transition: 'opacity 0.15s',
      }}
      onMouseOver={e => (e.currentTarget.style.opacity = '0.8')}
      onMouseOut={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 9 }}>{critico ? '🔴' : '🟡'}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: critico ? '#fca5a5' : '#fde68a' }}>
          {a.clientName}
        </span>
        {a.rule === 'manual' && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>manual</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#e2e8f0', marginBottom: a.action ? 4 : 0 }}>{a.message}</div>
      {a.action && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic' as const }}>
          → {a.action}
        </div>
      )}
    </div>
  );
}

// ─── ClientCard ───────────────────────────────────────────────────────────────
function ClientCard({
  client: c, dash, clientAlerts, tasks, T, onClick,
}: {
  client: any;
  dash: any | null;
  clientAlerts: AutoAlert[];
  tasks: any[];
  T: any;
  onClick: () => void;
}) {
  const sq = (SQUADS as any)[c.squad] || { label: '—', icon: '📋', color: '#a78bfa' };
  const hasCritical = clientAlerts.some(a => a.severity === 'critico');
  const hasAtencao  = clientAlerts.some(a => a.severity === 'atencao');
  const { curr, prev } = get7d(dash?.daily_data || []);
  const cpl7d     = curr.leads > 0 ? curr.investimento / curr.leads : 0;
  const prevCpl7d = prev.leads > 0 ? prev.investimento / prev.leads : 0;
  const openTasks = tasks.filter(t => t.client_id === c.id && t.status !== 'feito').length;

  const JM = "'JetBrains Mono', monospace";

  return (
    <div
      onClick={onClick}
      style={{
        background: T.card,
        border: `1px solid ${hasCritical ? 'rgba(239,68,68,0.22)' : T.bdr}`,
        borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
        position: 'relative' as const, overflow: 'hidden',
        opacity: c.status !== 'ativo' ? 0.5 : 1,
        transition: 'border-color 0.2s',
      }}
      onMouseOver={e => {
        e.currentTarget.style.borderColor = hasCritical ? 'rgba(239,68,68,0.45)' : 'rgba(99,102,241,0.4)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.borderColor = hasCritical ? 'rgba(239,68,68,0.22)' : T.bdr;
      }}
    >
      {/* squad color bar */}
      <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: 2, background: sq.color, opacity: 0.5 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.tx, fontFamily: "'Space Grotesk', 'DM Sans', system-ui", marginBottom: 4 }}>
            {c.name}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: sq.color + '18', color: sq.color, borderRadius: 5 }}>
              {sq.icon} {sq.label}
            </span>
            <StatusDot status={c.status} lastSync={dash?.last_sync || null} />
          </div>
        </div>

        {/* Alert badges */}
        {(hasCritical || hasAtencao) && (
          <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: 3 }}>
            {hasCritical && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'rgba(239,68,68,0.12)', color: '#fca5a5', borderRadius: 20 }}>
                CRITICO
              </span>
            )}
            {hasAtencao && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', background: 'rgba(245,158,11,0.1)', color: '#fde68a', borderRadius: 20 }}>
                ATENCAO
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics */}
      {dash ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
          {[
            { label: 'Invest. 7d', value: fB(curr.investimento),         delta: pctChange(curr.investimento, prev.investimento), inverse: false },
            { label: 'Leads 7d',   value: fN(curr.leads),                delta: pctChange(curr.leads, prev.leads),               inverse: false },
            { label: 'CPL 7d',     value: cpl7d > 0 ? fB2(cpl7d) : '—', delta: pctChange(cpl7d, prevCpl7d),                    inverse: true  },
            { label: 'ROAS',       value: dash.roas > 0 ? dash.roas.toFixed(2) + 'x' : '—', delta: null, inverse: false },
            { label: 'CTR',        value: dash.ctr  > 0 ? dash.ctr.toFixed(2) + '%' : '—',  delta: null, inverse: false },
            { label: 'CPM',        value: dash.cpm  > 0 ? fB(dash.cpm) : '—',               delta: null, inverse: true  },
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(255,255,255,0.025)', borderRadius: 8, padding: '7px 9px' }}>
              <div style={{ fontSize: 9, color: T.mt, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 2 }}>
                {m.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, fontFamily: JM, color: T.tx }}>{m.value}</div>
              {m.delta !== null && <DeltaChip pct={m.delta} inverse={m.inverse} />}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center' as const, padding: '12px 0', color: T.mt, fontSize: 12 }}>
          Sem dashboard configurado
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${T.bdr}` }}>
        <span style={{ fontSize: 10, color: T.mt }}>
          {dash?.last_sync
            ? 'sync ' + new Date(dash.last_sync).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            : 'sem sync'}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          {openTasks > 0 && (
            <span style={{ fontSize: 10, fontWeight: 600, color: '#f59e0b' }}>
              {openTasks} tarefa{openTasks > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 10, color: T.mt }}>
            {fB(c.fee)}/mes
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────
function FilterGroup({
  options, value, onChange, T,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
  T: any;
}) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3 }}>
      {options.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          style={{
            padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' as const,
            background: value === k ? 'rgba(99,102,241,0.2)' : 'transparent',
            color: value === k ? '#a5b4fc' : T.mt,
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
