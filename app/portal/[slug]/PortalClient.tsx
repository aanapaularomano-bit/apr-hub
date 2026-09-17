'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Design tokens ────────────────────────────────────────────
const C = {
  bg: '#F2F4F1',
  card: '#FFFFFF',
  secondary: '#EBEFE9',
  border: '#D7DDD6',
  text: '#121714',
  soft: '#5C6861',
  accent: '#3F6B00',
  accentBg: '#EBF2E0',
  ok: '#1E7F47',
  okBg: '#E4F5EC',
  error: '#B93B28',
  errorBg: '#FBEAE7',
  alertBg: '#FFF8E6',
  alertText: '#8A5F00',
  alertBorder: '#F0D882',
};

const fn = "'Space Grotesk', system-ui, sans-serif";
const fnTitle = "'Fraunces', Georgia, serif";
const fnMono = "'JetBrains Mono', 'Fira Mono', monospace";

const REQ_STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const REQ_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: C.alertBg, text: C.alertText },
  em_andamento: { bg: '#EEF2FF', text: '#3730A3' },
  concluido: { bg: C.okBg, text: C.ok },
  cancelado: { bg: '#F5F5F5', text: '#6B7280' },
};
const ACT_STATUS_LABEL: Record<string, string> = { todo: 'A fazer', doing: 'Em andamento', done: 'Feito', not_done: 'Não feito' };
const ACT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  todo: { bg: C.secondary, text: C.soft },
  doing: { bg: '#FEF3C7', text: '#92400E' },
  done: { bg: C.okBg, text: C.ok },
  not_done: { bg: C.errorBg, text: C.error },
};
const LAUNCH_STATUS_LABEL: Record<string, string> = { planejamento: 'Planejamento', em_andamento: 'Em andamento', concluido: 'Concluído', pausado: 'Pausado' };

interface Portal {
  id: string;
  client_id: string;
  slug: string;
  enabled: boolean;
  sections: Record<string, boolean>;
  clients: { id: string; name: string; squad: string; niche?: string; product?: string };
}

// ── Helpers ──────────────────────────────────────────────────

function formatDate(d?: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function fmtMoney(v: any) {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function fmtNum(v: any) {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString('pt-BR');
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', ...style }}>{children}</div>;
}

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return <span style={{ background: bg, color: text, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{label}</span>;
}

function LoadingState() {
  return <div style={{ padding: '40px 0', textAlign: 'center', color: C.soft, fontFamily: fn }}>Carregando...</div>;
}

// ── Login Screen ─────────────────────────────────────────────

function LoginScreen({ slug, clientName }: { slug: string; clientName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portal/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, password }) });
      if (res.ok) { router.refresh(); } else {
        const data = await res.json();
        setError(data.error || 'Senha incorreta');
        setLoading(false);
      }
    } catch { setError('Erro de conexão. Tente novamente.'); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: fn }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" /></svg>
        </div>
        <h1 style={{ fontFamily: fnTitle, fontSize: 26, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>Portal do Cliente</h1>
        <p style={{ color: C.soft, fontSize: 14, margin: '0 0 32px' }}>{clientName}</p>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Senha de acesso</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Digite sua senha" autoFocus required disabled={loading}
            style={{ width: '100%', padding: '13px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: fn, fontSize: 15, color: C.text, background: C.bg, outline: 'none', boxSizing: 'border-box' }} />
          {error && <div style={{ background: C.errorBg, border: `1px solid ${C.error}30`, color: C.error, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 }}>{error}</div>}
          <button type="submit" disabled={loading || !password}
            style={{ width: '100%', padding: 14, background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontFamily: fn, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 16, opacity: loading || !password ? 0.6 : 1 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: C.soft, fontSize: 12, marginTop: 28 }}>Acesso exclusivo — não compartilhe sua senha.</p>
      </div>
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ slug }: { slug: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/requests?slug=${slug}`).then(r => r.json()),
      fetch(`/api/portal/activities?slug=${slug}`).then(r => r.json()),
    ]).then(([req, act]) => {
      setRequests(req.requests || []);
      setActivities((act.activities || []).slice(0, 5));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  const pendingAgency = requests.filter(r => r.from === 'agency' && r.status === 'pendente');
  if (loading) return <LoadingState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {pendingAgency.length > 0 ? (
        <div style={{ background: C.alertBg, border: `1px solid ${C.alertBorder}`, borderRadius: 14, padding: '20px 22px' }}>
          <h2 style={{ fontFamily: fnTitle, fontSize: 18, fontWeight: 600, color: C.alertText, margin: '0 0 14px' }}>O que precisamos de você</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingAgency.map(req => (
              <div key={req.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.alertBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 14 }}>{req.title}</p>
                    {req.details && <p style={{ margin: '4px 0 0', color: C.soft, fontSize: 13 }}>{req.details}</p>}
                  </div>
                  {req.due_date && <span style={{ color: C.alertText, fontSize: 12, fontFamily: fnMono, whiteSpace: 'nowrap' as const }}>até {formatDate(req.due_date)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Card style={{ background: C.okBg, border: `1px solid ${C.ok}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <p style={{ margin: 0, color: C.ok, fontWeight: 600, fontSize: 14 }}>Tudo em dia. Nenhuma pendência no momento.</p>
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ fontFamily: fnTitle, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 14px' }}>Atividades recentes</h3>
        {activities.length === 0 ? (
          <p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma atividade disponível.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activities.map(a => {
              const sc = ACT_STATUS_COLOR[a.status] || ACT_STATUS_COLOR.todo;
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: C.bg, borderRadius: 9, gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: C.text, fontSize: 14 }}>{a.title}</span>
                    {a.date && <span style={{ color: C.soft, fontSize: 12, marginLeft: 8 }}>{formatDate(a.date)}</span>}
                  </div>
                  <Badge label={ACT_STATUS_LABEL[a.status] || a.status} bg={sc.bg} text={sc.text} />
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Daily Tab ─────────────────────────────────────────────────

function DailyTab({ slug }: { slug: string }) {
  const [dates, setDates] = useState<string[]>([]);
  const [selDate, setSelDate] = useState<string | null>(null);
  const [data, setData] = useState<{ report: any; activities: any[]; pending_requests: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/daily?slug=${slug}`)
      .then(r => r.json())
      .then(d => { const ds = d.dates || []; setDates(ds); if (ds.length > 0) setSelDate(ds[0]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!selDate) return;
    setDetailLoading(true);
    fetch(`/api/portal/daily?slug=${slug}&date=${selDate}`)
      .then(r => r.json())
      .then(d => { setData(d.report ? d : null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [slug, selDate]);

  if (loading) return <LoadingState />;

  if (dates.length === 0) {
    return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum relatório diário disponível ainda.</p></Card>;
  }

  const metrics = data?.report?.metrics || {};
  const METRIC_CARDS = [
    { key: 'investimento', label: 'Investimento', fmt: fmtMoney },
    { key: 'leads', label: 'Leads', fmt: fmtNum },
    { key: 'cpl', label: 'CPL', fmt: fmtMoney },
    { key: 'vendas', label: 'Vendas', fmt: fmtNum },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Date selector */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {dates.map(d => (
          <button key={d} onClick={() => setSelDate(d)}
            style={{ background: selDate === d ? C.accentBg : C.card, border: `1px solid ${selDate === d ? C.accent : C.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: fn, fontSize: 13, fontWeight: selDate === d ? 600 : 500, color: selDate === d ? C.accent : C.text }}>
            {formatDate(d)}
          </button>
        ))}
      </div>

      {detailLoading ? <LoadingState /> : !data ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Relatório não encontrado.</p></Card>
      ) : (
        <>
          {/* Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {METRIC_CARDS.map(m => (
              <Card key={m.key} style={{ textAlign: 'center' as const, padding: '16px 12px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: C.soft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, fontFamily: fnMono }}>{m.fmt(metrics[m.key])}</p>
              </Card>
            ))}
          </div>

          {/* Activities */}
          {data.activities.length > 0 && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 14px' }}>Atividades do dia</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.activities.map((a: any) => {
                  const sc = ACT_STATUS_COLOR[a.status] || ACT_STATUS_COLOR.todo;
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, padding: '10px 12px', background: C.bg, borderRadius: 9 }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 14, color: C.text }}>{a.title}</span>
                        <span style={{ fontSize: 12, color: C.soft, marginLeft: 8 }}>{a.responsible === 'agency' ? 'Agência' : 'Cliente'}</span>
                        {a.status === 'not_done' && a.justification && (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: C.soft, fontStyle: 'italic' }}>{a.justification}</p>
                        )}
                      </div>
                      <Badge label={ACT_STATUS_LABEL[a.status] || a.status} bg={sc.bg} text={sc.text} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Pending requests */}
          {data.pending_requests.length > 0 && (
            <Card style={{ background: C.alertBg, border: `1px solid ${C.alertBorder}` }}>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.alertText, margin: '0 0 12px' }}>Pendencias em aberto</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.pending_requests.map((r: any) => (
                  <div key={r.id} style={{ background: '#fff', borderRadius: 9, padding: '10px 14px', border: `1px solid ${C.alertBorder}` }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{r.title}</p>
                    {r.due_date && <p style={{ margin: '3px 0 0', fontSize: 12, color: C.alertText, fontFamily: fnMono }}>até {formatDate(r.due_date)}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Note */}
          {data.report.note && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>Observações</h3>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{data.report.note}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Activities Tab ────────────────────────────────────────────

function ActivitiesTab({ slug }: { slug: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterResp, setFilterResp] = useState('all');

  useEffect(() => {
    fetch(`/api/portal/activities?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingState />;

  const filtered = filterResp === 'all' ? activities : activities.filter(a => a.responsible === filterResp);

  // Group by date
  const grouped: Record<string, any[]> = {};
  for (const a of filtered) {
    if (!grouped[a.date]) grouped[a.date] = [];
    grouped[a.date].push(a);
  }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {[{ v: 'all', l: 'Todas' }, { v: 'agency', l: 'Agência' }, { v: 'client', l: 'Cliente' }].map(f => (
          <button key={f.v} onClick={() => setFilterResp(f.v)}
            style={{ background: filterResp === f.v ? C.accentBg : C.card, border: `1px solid ${filterResp === f.v ? C.accent : C.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: fn, fontSize: 13, fontWeight: filterResp === f.v ? 600 : 500, color: filterResp === f.v ? C.accent : C.text }}>
            {f.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma atividade encontrada.</p></Card>
      ) : (
        dates.map(date => (
          <div key={date}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{formatDate(date)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {grouped[date].map(a => {
                const sc = ACT_STATUS_COLOR[a.status] || ACT_STATUS_COLOR.todo;
                return (
                  <Card key={a.id} style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: C.text }}>{a.title}</p>
                        <span style={{ fontSize: 12, color: C.soft }}>{a.responsible === 'agency' ? 'Agência' : 'Cliente'}</span>
                        {a.status === 'not_done' && a.justification && (
                          <p style={{ margin: '6px 0 0', fontSize: 13, color: C.soft, fontStyle: 'italic' }}>{a.justification}</p>
                        )}
                      </div>
                      <Badge label={ACT_STATUS_LABEL[a.status] || a.status} bg={sc.bg} text={sc.text} />
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Requests Tab ─────────────────────────────────────────────

function RequestsTab({ slug }: { slug: string }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', details: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/portal/requests?slug=${slug}`).then(r => r.json()).then(d => { setRequests(d.requests || []); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function submitRequest() {
    if (!form.title.trim()) { setFormError('Digite um título para a solicitação.'); return; }
    setSaving(true); setFormError('');
    const res = await fetch(`/api/portal/requests?slug=${slug}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setForm({ title: '', details: '' }); setShowForm(false); load(); } else { setFormError('Erro ao enviar. Tente novamente.'); }
  }

  const agencyRequests = requests.filter(r => r.from === 'agency');
  const clientRequests = requests.filter(r => r.from === 'client');

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h3 style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>Nós pedimos a você</h3>
        {agencyRequests.length === 0 ? (
          <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma solicitação pendente da nossa parte.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agencyRequests.map(req => {
              const sc = REQ_STATUS_COLOR[req.status] || REQ_STATUS_COLOR.pendente;
              return (
                <Card key={req.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: req.details ? 6 : 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{req.title}</span>
                        <Badge label={REQ_STATUS_LABEL[req.status] || req.status} bg={sc.bg} text={sc.text} />
                      </div>
                      {req.details && <p style={{ margin: 0, color: C.soft, fontSize: 13 }}>{req.details}</p>}
                      {req.note && <p style={{ margin: '6px 0 0', color: C.soft, fontSize: 13, fontStyle: 'italic' }}>Obs: {req.note}</p>}
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      {req.due_date && <p style={{ color: C.alertText, fontSize: 12, fontFamily: fnMono, margin: 0 }}>até {formatDate(req.due_date)}</p>}
                      <p style={{ color: C.soft, fontSize: 11, margin: '4px 0 0' }}>{formatDate(req.created_at?.slice(0, 10))}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, color: C.text, margin: 0 }}>Você pediu à agência</h3>
          <button onClick={() => setShowForm(!showForm)} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova solicitação
          </button>
        </div>

        {showForm && (
          <Card style={{ marginBottom: 12, background: C.secondary }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: C.text }}>Nova solicitação</p>
            <input type="text" placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: fn, fontSize: 14, color: C.text, background: C.card, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 8 }} />
            <textarea placeholder="Detalhes (opcional)" value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: fn, fontSize: 14, color: C.text, background: C.card, outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, marginBottom: 8 }} />
            {formError && <p style={{ color: C.error, fontSize: 13, margin: '0 0 8px' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitRequest} disabled={saving} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? 'Enviando...' : 'Enviar'}</button>
              <button onClick={() => { setShowForm(false); setFormError(''); }} style={{ background: C.secondary, color: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 18px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </Card>
        )}

        {clientRequests.length === 0 ? (
          <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Você ainda não fez nenhuma solicitação.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientRequests.map(req => {
              const sc = REQ_STATUS_COLOR[req.status] || REQ_STATUS_COLOR.pendente;
              return (
                <Card key={req.id}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: req.details ? 6 : 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{req.title}</span>
                        <Badge label={REQ_STATUS_LABEL[req.status] || req.status} bg={sc.bg} text={sc.text} />
                      </div>
                      {req.details && <p style={{ margin: 0, color: C.soft, fontSize: 13 }}>{req.details}</p>}
                      {req.note && <p style={{ margin: '6px 0 0', color: C.soft, fontSize: 13, fontStyle: 'italic' }}>Resposta: {req.note}</p>}
                    </div>
                    <p style={{ color: C.soft, fontSize: 11, margin: 0, flexShrink: 0 }}>{formatDate(req.created_at?.slice(0, 10))}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Launches Tab ──────────────────────────────────────────────

function LaunchesTab({ slug }: { slug: string }) {
  const [launches, setLaunches] = useState<any[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ launch: any; links: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/launches?slug=${slug}`).then(r => r.json()).then(d => { setLaunches(d.launches || []); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!selId) return;
    setDetailLoading(true);
    fetch(`/api/portal/launches?slug=${slug}&id=${selId}`).then(r => r.json()).then(d => { setDetail(d); setDetailLoading(false); }).catch(() => setDetailLoading(false));
  }, [slug, selId]);

  if (loading) return <LoadingState />;

  if (launches.length === 0) return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum lançamento disponível.</p></Card>;

  const launch = detail?.launch;
  const phases: any[] = launch?.portal_launch_phases || [];
  const goals = launch?.goals || {};
  const results = launch?.results || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Launch list */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {launches.map(l => (
          <button key={l.id} onClick={() => setSelId(l.id)}
            style={{ background: selId === l.id ? C.accentBg : C.card, border: `1px solid ${selId === l.id ? C.accent : C.border}`, borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontFamily: fn, textAlign: 'left' as const }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: selId === l.id ? C.accent : C.text }}>{l.name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: C.soft }}>{LAUNCH_STATUS_LABEL[l.status]}</p>
          </button>
        ))}
      </div>

      {selId && (detailLoading ? <LoadingState /> : !detail ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Não foi possível carregar o lançamento.</p></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <div>
            <h2 style={{ fontFamily: fnTitle, fontSize: 20, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>{launch.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: C.soft }}>
              {LAUNCH_STATUS_LABEL[launch.status]}
              {launch.start_date && ` · ${formatDate(launch.start_date)} — ${formatDate(launch.end_date)}`}
            </p>
          </div>

          {/* Phases timeline */}
          {phases.length > 0 && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 16px' }}>Fases</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {phases.map((p: any, i: number) => (
                  <div key={p.id} style={{ display: 'flex', gap: 14, position: 'relative' as const }}>
                    {/* Timeline line */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: C.accent, border: `2px solid ${C.accentBg}`, flexShrink: 0, marginTop: 4 }} />
                      {i < phases.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 24, background: C.border, margin: '4px 0' }} />}
                    </div>
                    <div style={{ flex: 1, paddingBottom: i < phases.length - 1 ? 16 : 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 14, color: C.text }}>{p.name}</p>
                      {(p.start_date || p.end_date) && (
                        <p style={{ margin: 0, fontSize: 12, color: C.soft, fontFamily: fnMono }}>{formatDate(p.start_date)} — {formatDate(p.end_date)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Goals */}
          {Object.keys(goals).length > 0 && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 14px' }}>Metas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(goals).map(([k, v]: [string, any]) => {
                  const target = typeof v === 'object' ? v?.target : v;
                  const current = typeof v === 'object' ? v?.current : (results[k] ?? null);
                  const pct = target && current ? Math.min(100, Math.round((Number(current) / Number(target)) * 100)) : null;
                  return (
                    <div key={k}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, textTransform: 'capitalize' }}>{k}</span>
                        <span style={{ fontSize: 13, color: C.soft, fontFamily: fnMono }}>
                          {current != null ? `${current} / ` : ''}{target}
                          {pct != null && <span style={{ marginLeft: 8, color: C.accent, fontWeight: 600 }}>{pct}%</span>}
                        </span>
                      </div>
                      {pct != null && (
                        <div style={{ height: 6, background: C.secondary, borderRadius: 10 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: C.accent, borderRadius: 10, transition: 'width 0.4s ease' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Links */}
          {(detail.links || []).length > 0 && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>Links do lançamento</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(detail.links || []).map((l: any) => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: C.bg, borderRadius: 9, gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{l.label}</p>
                      {l.description && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.soft }}>{l.description}</p>}
                    </div>
                    <a href={l.url} target="_blank" rel="noopener noreferrer"
                      style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: '6px 12px', fontSize: 13, color: C.accent, fontFamily: fn, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>
                      Abrir
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Links Tab ─────────────────────────────────────────────────

function LinksTab({ slug }: { slug: string }) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/links?slug=${slug}`).then(r => r.json()).then(d => { setLinks(d.links || []); setLoading(false); }).catch(() => setLoading(false));
  }, [slug]);

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url).then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); });
  }

  const filtered = search.trim()
    ? links.filter(l => l.label.toLowerCase().includes(search.toLowerCase()) || l.url.toLowerCase().includes(search.toLowerCase()) || (l.description || '').toLowerCase().includes(search.toLowerCase()))
    : links;

  const groups = Array.from(new Set(filtered.map(l => l.group_name)));

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar links..."
        style={{ width: '100%', padding: '11px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: fn, fontSize: 14, color: C.text, background: C.card, outline: 'none', boxSizing: 'border-box' as const }}
      />

      {filtered.length === 0 ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>{search ? 'Nenhum resultado para esta busca.' : 'Nenhum link cadastrado ainda.'}</p></Card>
      ) : (
        groups.map(group => (
          <div key={group}>
            <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>{group}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.filter(l => l.group_name === group).map(link => (
                <Card key={link.id} style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{link.label}</p>
                        {link.tag && <span style={{ fontSize: 11, background: C.accentBg, color: C.accent, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>{link.tag}</span>}
                      </div>
                      {link.description && <p style={{ margin: '2px 0 0', fontSize: 13, color: C.soft }}>{link.description}</p>}
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: C.soft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{link.url}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => copyUrl(link.url, link.id)}
                        style={{ background: copied === link.id ? C.okBg : C.secondary, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: copied === link.id ? C.ok : C.soft, fontFamily: fn, fontWeight: 600 }}>
                        {copied === link.id ? 'Copiado' : 'Copiar'}
                      </button>
                      <a href={link.url} target="_blank" rel="noopener noreferrer"
                        style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: '7px 12px', fontSize: 13, color: C.accent, fontFamily: fn, fontWeight: 600, textDecoration: 'none' }}>
                        Abrir
                      </a>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Weekly Tab ────────────────────────────────────────────────

function WeeklyTab({ slug }: { slug: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/weekly?slug=${slug}`)
      .then(r => r.json())
      .then(d => { const rs = d.reports || []; setReports(rs); if (rs.length > 0) setSelId(rs[0].id); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!selId) return;
    setDetailLoading(true);
    fetch(`/api/portal/weekly?slug=${slug}&id=${selId}`)
      .then(r => r.json())
      .then(d => { setReport(d.report || null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [slug, selId]);

  if (loading) return <LoadingState />;
  if (reports.length === 0) return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum relatório semanal disponível.</p></Card>;

  const METRIC_CARDS = [
    { key: 'investimento', label: 'Investimento', fmt: fmtMoney },
    { key: 'leads', label: 'Leads', fmt: fmtNum },
    { key: 'cpl', label: 'CPL', fmt: fmtMoney },
    { key: 'vendas', label: 'Vendas', fmt: fmtNum },
  ];

  function fmtWeek(start?: string | null, end?: string | null) {
    if (!start) return '—';
    return `${formatDate(start)} — ${formatDate(end)}`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {reports.map(r => (
          <button key={r.id} onClick={() => setSelId(r.id)}
            style={{ background: selId === r.id ? C.accentBg : C.card, border: `1px solid ${selId === r.id ? C.accent : C.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: fn, fontSize: 13, fontWeight: selId === r.id ? 600 : 500, color: selId === r.id ? C.accent : C.text }}>
            {formatDate(r.week_start)}
          </button>
        ))}
      </div>

      {detailLoading ? <LoadingState /> : !report ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Relatório não encontrado.</p></Card>
      ) : (
        <>
          {report.metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {METRIC_CARDS.map(m => (
                <Card key={m.key} style={{ textAlign: 'center' as const, padding: '16px 12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: C.soft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, fontFamily: fnMono }}>{m.fmt(report.metrics[m.key])}</p>
                </Card>
              ))}
            </div>
          )}
          {report.highlights && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>Destaques</h3>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{report.highlights}</p>
            </Card>
          )}
          {report.note && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>Observações</h3>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{report.note}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Monthly Tab ───────────────────────────────────────────────

function MonthlyTab({ slug }: { slug: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/portal/monthly?slug=${slug}`)
      .then(r => r.json())
      .then(d => { const rs = d.reports || []; setReports(rs); if (rs.length > 0) setSelId(rs[0].id); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!selId) return;
    setDetailLoading(true);
    fetch(`/api/portal/monthly?slug=${slug}&id=${selId}`)
      .then(r => r.json())
      .then(d => { setReport(d.report || null); setDetailLoading(false); })
      .catch(() => setDetailLoading(false));
  }, [slug, selId]);

  if (loading) return <LoadingState />;
  if (reports.length === 0) return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum relatório mensal disponível.</p></Card>;

  function fmtMonthKey(mk?: string | null) {
    if (!mk) return '—';
    const [y, m] = mk.split('-');
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  const METRIC_CARDS = [
    { key: 'investimento', label: 'Investimento', fmt: fmtMoney },
    { key: 'leads', label: 'Leads', fmt: fmtNum },
    { key: 'cpl', label: 'CPL', fmt: fmtMoney },
    { key: 'vendas', label: 'Vendas', fmt: fmtNum },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
        {reports.map(r => (
          <button key={r.id} onClick={() => setSelId(r.id)}
            style={{ background: selId === r.id ? C.accentBg : C.card, border: `1px solid ${selId === r.id ? C.accent : C.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontFamily: fn, fontSize: 13, fontWeight: selId === r.id ? 600 : 500, color: selId === r.id ? C.accent : C.text }}>
            {fmtMonthKey(r.month_key)}
          </button>
        ))}
      </div>

      {detailLoading ? <LoadingState /> : !report ? (
        <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Relatório não encontrado.</p></Card>
      ) : (
        <>
          {report.metrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {METRIC_CARDS.map(m => (
                <Card key={m.key} style={{ textAlign: 'center' as const, padding: '16px 12px' }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: C.soft, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text, fontFamily: fnMono }}>{m.fmt(report.metrics[m.key])}</p>
                </Card>
              ))}
            </div>
          )}
          {report.highlights && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>Destaques do mês</h3>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{report.highlights}</p>
            </Card>
          )}
          {report.note && (
            <Card>
              <h3 style={{ fontFamily: fnTitle, fontSize: 15, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>Observações</h3>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{report.note}</p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ── Optimizations Tab ─────────────────────────────────────────

function OptimizationsTab({ slug }: { slug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/optimizations?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setItems(d.optimizations || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingState />;
  if (items.length === 0) return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma otimização disponível.</p></Card>;

  const grouped: Record<string, any[]> = {};
  for (const o of items) { if (!grouped[o.date]) grouped[o.date] = []; grouped[o.date].push(o); }
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {dates.map(date => (
        <div key={date}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>{formatDate(date)}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grouped[date].map(o => (
              <Card key={o.id} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: C.accentBg, color: C.accent, padding: '3px 10px', borderRadius: 8, flexShrink: 0, marginTop: 2 }}>{o.type}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: C.text }}>{o.what_done}</p>
                    {o.campaign && <p style={{ margin: '0 0 4px', fontSize: 13, color: C.soft }}>Campanha: {o.campaign}</p>}
                    {o.why && <p style={{ margin: '0 0 4px', fontSize: 13, color: C.soft }}>Por quê: {o.why}</p>}
                    {o.result && <p style={{ margin: 0, fontSize: 13, color: C.soft }}>Resultado: {o.result}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Content Tab ───────────────────────────────────────────────

const CONTENT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: '#FEF3C7', text: '#92400E' },
  aprovado: { bg: '#EEF2FF', text: '#3730A3' },
  publicado: { bg: '#E4F5EC', text: '#1E7F47' },
  reprovado: { bg: '#FBEAE7', text: '#B93B28' },
};
const CONTENT_STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', aprovado: 'Aprovado', publicado: 'Publicado', reprovado: 'Reprovado' };

function ContentTab({ slug }: { slug: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/portal/content?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setItems(d.content || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingState />;
  if (items.length === 0) return <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum conteúdo disponível.</p></Card>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(c => {
        const sc = CONTENT_STATUS_COLOR[c.status] || CONTENT_STATUS_COLOR.pendente;
        return (
          <Card key={c.id} style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: c.notes ? 6 : 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{c.name}</span>
                  <Badge label={c.format} bg={C.secondary} text={C.soft} />
                  {c.send_date && <span style={{ fontSize: 12, color: C.soft, fontFamily: fnMono }}>{formatDate(c.send_date)}</span>}
                </div>
                {c.notes && <p style={{ margin: 0, fontSize: 13, color: C.soft }}>{c.notes}</p>}
              </div>
              <Badge label={CONTENT_STATUS_LABEL[c.status] || c.status} bg={sc.bg} text={sc.text} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────

const NAV = [
  { id: 'overview', label: 'Visão Geral', section: 'overview' as const },
  { id: 'daily', label: 'Diário', section: 'daily' as const },
  { id: 'activities', label: 'Atividades', section: 'activities' as const },
  { id: 'requests', label: 'Solicitações', section: 'requests' as const },
  { id: 'weekly', label: 'Relatório Semanal', section: 'weekly' as const },
  { id: 'monthly', label: 'Relatório Mensal', section: 'monthly' as const },
  { id: 'optimizations', label: 'Otimizações', section: 'optimizations' as const },
  { id: 'content', label: 'Conteúdo', section: 'content' as const },
  { id: 'launches', label: 'Lançamentos', section: 'launches' as const },
  { id: 'links', label: 'Links e Arquivos', section: 'links' as const },
];

// ── Main Portal Shell ─────────────────────────────────────────

export default function PortalClient({ portal, isLoggedIn, slug }: { portal: Portal; isLoggedIn: boolean; slug: string }) {
  const router = useRouter();
  const clientName = (portal.clients as any)?.name || slug;
  const sections = portal.sections || {};

  const [tab, setTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function handleLogout() {
    await fetch('/api/portal/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }) });
    router.refresh();
  }

  if (!isLoggedIn) return <LoginScreen slug={slug} clientName={clientName} />;

  // Filter nav by enabled sections
  const visibleNav = NAV.filter(n => {
    if (!n.section) return true;
    return sections[n.section] !== false;
  });

  const currentTab = visibleNav.find(n => n.id === tab) ? tab : (visibleNav[0]?.id || 'overview');

  function NavItem({ item }: { item: typeof NAV[0] }) {
    const isActive = currentTab === item.id;
    return (
      <button
        onClick={() => { setTab(item.id); setMenuOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, width: '100%',
          background: isActive ? C.accentBg : 'transparent',
          border: isActive ? `1px solid ${C.accent}30` : '1px solid transparent',
          color: isActive ? C.accent : C.text,
          cursor: 'pointer',
          fontFamily: fn, fontSize: 14, fontWeight: isActive ? 600 : 500,
          textAlign: 'left' as const,
        }}
      >
        <span style={{ flex: 1 }}>{item.label}</span>
      </button>
    );
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" /></svg>
          </div>
          <div>
            <div style={{ fontFamily: fnTitle, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>Portal do Cliente</div>
            <div style={{ fontSize: 12, color: C.soft, marginTop: 1 }}>{clientName}</div>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' as const }}>
        {visibleNav.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', fontFamily: fn, fontSize: 13, color: C.soft, textAlign: 'left' as const }}>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: fn, display: 'flex' }}>
      {!isMobile && (
        <aside style={{ width: 240, minHeight: '100vh', background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
          {sidebarContent}
        </aside>
      )}

      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" /></svg>
            </div>
            <span style={{ fontFamily: fnTitle, fontSize: 14, fontWeight: 600, color: C.text }}>Portal do Cliente</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: C.text, fontSize: 18 }}>
            {menuOpen ? 'X' : '='}
          </button>
        </div>
      )}

      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position: 'absolute', top: 60, left: 0, bottom: 0, width: 260, background: C.card, borderRight: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      <main style={{ flex: 1, padding: isMobile ? '76px 16px 24px' : '32px 32px 32px', maxWidth: 760, minWidth: 0 }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: fnTitle, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
            {visibleNav.find(n => n.id === currentTab)?.label || 'Visão Geral'}
          </h1>
          <p style={{ color: C.soft, fontSize: 13, margin: 0 }}>{clientName}</p>
        </div>

        {currentTab === 'overview' && <OverviewTab slug={slug} />}
        {currentTab === 'daily' && <DailyTab slug={slug} />}
        {currentTab === 'activities' && <ActivitiesTab slug={slug} />}
        {currentTab === 'requests' && <RequestsTab slug={slug} />}
        {currentTab === 'weekly' && <WeeklyTab slug={slug} />}
        {currentTab === 'monthly' && <MonthlyTab slug={slug} />}
        {currentTab === 'optimizations' && <OptimizationsTab slug={slug} />}
        {currentTab === 'content' && <ContentTab slug={slug} />}
        {currentTab === 'launches' && <LaunchesTab slug={slug} />}
        {currentTab === 'links' && <LinksTab slug={slug} />}
      </main>
    </div>
  );
}
