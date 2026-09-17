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

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: C.alertBg, text: C.alertText },
  em_andamento: { bg: '#EEF2FF', text: '#3730A3' },
  concluido: { bg: C.okBg, text: C.ok },
  cancelado: { bg: '#F5F5F5', text: '#6B7280' },
};

const TASK_STATUS_LABEL: Record<string, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluído',
};

interface Portal {
  id: string;
  client_id: string;
  slug: string;
  enabled: boolean;
  sections: { overview: boolean; requests: boolean; links: boolean };
  clients: { id: string; name: string; squad: string; niche?: string; product?: string };
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
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Senha incorreta');
        setLoading(false);
      }
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: fn }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        {/* Logo mark */}
        <div style={{ width: 52, height: 52, borderRadius: 14, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" />
          </svg>
        </div>

        <h1 style={{ fontFamily: fnTitle, fontSize: 26, fontWeight: 600, color: C.text, margin: '0 0 6px' }}>
          Portal do Cliente
        </h1>
        <p style={{ color: C.soft, fontSize: 14, margin: '0 0 32px' }}>{clientName}</p>

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.soft, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
            Senha de acesso
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            autoFocus
            required
            disabled={loading}
            style={{ width: '100%', padding: '13px 14px', border: `1px solid ${C.border}`, borderRadius: 10, fontFamily: fn, fontSize: 15, color: C.text, background: C.bg, outline: 'none', boxSizing: 'border-box' }}
          />
          {error && (
            <div style={{ background: C.errorBg, border: `1px solid ${C.error}30`, color: C.error, padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{ width: '100%', padding: 14, background: C.accent, color: '#fff', border: 'none', borderRadius: 10, fontFamily: fn, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 16, opacity: loading || !password ? 0.6 : 1 }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: C.soft, fontSize: 12, marginTop: 28 }}>
          Acesso exclusivo — não compartilhe sua senha.
        </p>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────

function Badge({ status }: { status: string }) {
  const s = STATUS_COLOR[status] || STATUS_COLOR.pendente;
  return (
    <span style={{ background: s.bg, color: s.text, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function formatDate(d?: string | null) {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────

function OverviewTab({ slug, clientName }: { slug: string; clientName: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/portal/tasks?slug=${slug}`).then(r => r.json()),
      fetch(`/api/portal/requests?slug=${slug}`).then(r => r.json()),
    ]).then(([t, r]) => {
      setTasks(t.tasks || []);
      setRequests(r.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  const pendingAgency = requests.filter(r => r.from === 'agency' && r.status === 'pendente');
  const recentTasks = tasks.slice(0, 5);

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Bloco de atenção */}
      {pendingAgency.length > 0 && (
        <div style={{ background: C.alertBg, border: `1px solid ${C.alertBorder}`, borderRadius: 14, padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <h2 style={{ fontFamily: fnTitle, fontSize: 18, fontWeight: 600, color: C.alertText, margin: 0 }}>
              O que precisamos de você
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingAgency.map(req => (
              <div key={req.id} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', border: `1px solid ${C.alertBorder}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 14 }}>{req.title}</p>
                    {req.details && <p style={{ margin: '4px 0 0', color: C.soft, fontSize: 13 }}>{req.details}</p>}
                  </div>
                  {req.due_date && (
                    <span style={{ color: C.alertText, fontSize: 12, fontFamily: fnMono, whiteSpace: 'nowrap' as const }}>
                      até {formatDate(req.due_date)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingAgency.length === 0 && (
        <Card style={{ background: C.okBg, border: `1px solid ${C.ok}30` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <p style={{ margin: 0, color: C.ok, fontWeight: 600, fontSize: 14 }}>Tudo em dia! Nenhuma pendência no momento.</p>
          </div>
        </Card>
      )}

      {/* Tarefas recentes */}
      <Card>
        <h3 style={{ fontFamily: fnTitle, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 14px' }}>
          Últimas atividades
        </h3>
        {recentTasks.length === 0 ? (
          <p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma atividade disponível no momento.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTasks.map(task => (
              <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: C.bg, borderRadius: 9, gap: 12 }}>
                <span style={{ color: C.text, fontSize: 14, flex: 1 }}>{task.title}</span>
                <span style={{ background: task.status === 'done' ? C.okBg : C.secondary, color: task.status === 'done' ? C.ok : C.soft, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                  {TASK_STATUS_LABEL[task.status] || task.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

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
    fetch(`/api/portal/requests?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setRequests(d.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function submitRequest() {
    if (!form.title.trim()) { setFormError('Digite um título para a solicitação.'); return; }
    setSaving(true);
    setFormError('');
    const res = await fetch(`/api/portal/requests?slug=${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ title: '', details: '' });
      setShowForm(false);
      load();
    } else {
      setFormError('Erro ao enviar. Tente novamente.');
    }
  }

  const agencyRequests = requests.filter(r => r.from === 'agency');
  const clientRequests = requests.filter(r => r.from === 'client');

  if (loading) return <LoadingState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Agency → Client */}
      <div>
        <h3 style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, color: C.text, margin: '0 0 12px' }}>
          Nós pedimos a você
        </h3>
        {agencyRequests.length === 0 ? (
          <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhuma solicitação pendente da nossa parte.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {agencyRequests.map(req => (
              <Card key={req.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: req.details ? 6 : 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{req.title}</span>
                      <Badge status={req.status} />
                    </div>
                    {req.details && <p style={{ margin: 0, color: C.soft, fontSize: 13 }}>{req.details}</p>}
                    {req.note && <p style={{ margin: '6px 0 0', color: C.soft, fontSize: 13, fontStyle: 'italic' }}>Obs: {req.note}</p>}
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    {req.due_date && (
                      <p style={{ color: C.alertText, fontSize: 12, fontFamily: fnMono, margin: 0 }}>até {formatDate(req.due_date)}</p>
                    )}
                    <p style={{ color: C.soft, fontSize: 11, margin: '4px 0 0' }}>{formatDate(req.created_at?.slice(0, 10))}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Client → Agency */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontFamily: fnTitle, fontSize: 17, fontWeight: 600, color: C.text, margin: 0 }}>
            Você pediu à agência
          </h3>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            + Nova solicitação
          </button>
        </div>

        {showForm && (
          <Card style={{ marginBottom: 12, background: C.secondary }}>
            <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: C.text }}>Nova solicitação</p>
            <input
              type="text"
              placeholder="Título *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: fn, fontSize: 14, color: C.text, background: C.card, outline: 'none', boxSizing: 'border-box' as const, marginBottom: 8 }}
            />
            <textarea
              placeholder="Detalhes (opcional)"
              value={form.details}
              onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontFamily: fn, fontSize: 14, color: C.text, background: C.card, outline: 'none', boxSizing: 'border-box' as const, resize: 'vertical' as const, marginBottom: 8 }}
            />
            {formError && <p style={{ color: C.error, fontSize: 13, margin: '0 0 8px' }}>{formError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={submitRequest} disabled={saving} style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Enviando...' : 'Enviar'}
              </button>
              <button onClick={() => { setShowForm(false); setFormError(''); }} style={{ background: C.secondary, color: C.soft, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 18px', fontFamily: fn, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {clientRequests.length === 0 ? (
          <Card><p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Você ainda não fez nenhuma solicitação.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {clientRequests.map(req => (
              <Card key={req.id}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: req.details ? 6 : 0 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{req.title}</span>
                      <Badge status={req.status} />
                    </div>
                    {req.details && <p style={{ margin: 0, color: C.soft, fontSize: 13 }}>{req.details}</p>}
                    {req.note && <p style={{ margin: '6px 0 0', color: C.soft, fontSize: 13, fontStyle: 'italic' }}>Resposta: {req.note}</p>}
                  </div>
                  <p style={{ color: C.soft, fontSize: 11, margin: 0, flexShrink: 0 }}>{formatDate(req.created_at?.slice(0, 10))}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Links Tab ─────────────────────────────────────────────────

function LinksTab({ slug }: { slug: string }) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/portal/links?slug=${slug}`)
      .then(r => r.json())
      .then(d => { setLinks(d.links || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  function copyUrl(url: string, id: string) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const groups = Array.from(new Set(links.map(l => l.group_name)));

  if (loading) return <LoadingState />;

  if (links.length === 0) {
    return (
      <Card>
        <p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Nenhum link cadastrado ainda.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map(group => (
        <div key={group}>
          <h3 style={{ fontFamily: fnTitle, fontSize: 16, fontWeight: 600, color: C.text, margin: '0 0 10px' }}>{group}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {links.filter(l => l.group_name === group).map(link => (
              <Card key={link.id} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.text }}>{link.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: C.soft, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{link.url}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => copyUrl(link.url, link.id)}
                      title="Copiar link"
                      style={{ background: copied === link.id ? C.okBg : C.secondary, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: copied === link.id ? C.ok : C.soft, fontFamily: fn, fontWeight: 600 }}
                    >
                      {copied === link.id ? '✓ Copiado' : 'Copiar'}
                    </button>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: C.accentBg, border: `1px solid ${C.accent}30`, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: C.accent, fontFamily: fn, fontWeight: 600, textDecoration: 'none' }}
                    >
                      Abrir ↗
                    </a>
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

// ── Coming Soon ───────────────────────────────────────────────

function ComingSoon({ label }: { label: string }) {
  return (
    <Card style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>🚧</div>
      <h3 style={{ fontFamily: fnTitle, fontSize: 18, color: C.text, margin: '0 0 8px' }}>{label}</h3>
      <p style={{ color: C.soft, fontSize: 14, margin: 0 }}>Esta seção estará disponível em breve.</p>
    </Card>
  );
}

// ── Loading ───────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: C.soft, fontFamily: fn }}>
      Carregando...
    </div>
  );
}

// ── Nav items ─────────────────────────────────────────────────

const NAV = [
  { id: 'overview', label: 'Visão Geral', icon: '🏠', section: 'overview' as const },
  { id: 'requests', label: 'Solicitações', icon: '📋', section: 'requests' as const },
  { id: 'links', label: 'Links e Arquivos', icon: '🔗', section: 'links' as const },
  { id: 'reports', label: 'Relatórios', icon: '📊', soon: true },
  { id: 'optimizations', label: 'Otimizações', icon: '🎯', soon: true },
  { id: 'content', label: 'Conteúdo', icon: '📝', soon: true },
];

// ── Main Portal Shell ─────────────────────────────────────────

export default function PortalClient({
  portal,
  isLoggedIn,
  slug,
}: {
  portal: Portal;
  isLoggedIn: boolean;
  slug: string;
}) {
  const router = useRouter();
  const clientName = (portal.clients as any)?.name || slug;
  const sections = portal.sections || { overview: true, requests: true, links: true };

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
    await fetch('/api/portal/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    router.refresh();
  }

  if (!isLoggedIn) {
    return <LoginScreen slug={slug} clientName={clientName} />;
  }

  // Filter nav by enabled sections
  const visibleNav = NAV.filter(n => {
    if (n.soon) return true;
    if (n.section === 'overview') return sections.overview !== false;
    if (n.section === 'requests') return sections.requests !== false;
    if (n.section === 'links') return sections.links !== false;
    return true;
  });

  const currentTab = visibleNav.find(n => n.id === tab) ? tab : (visibleNav[0]?.id || 'overview');

  function NavItem({ item }: { item: typeof NAV[0] }) {
    const isActive = currentTab === item.id;
    return (
      <button
        onClick={() => { if (!item.soon) { setTab(item.id); setMenuOpen(false); } }}
        disabled={item.soon}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', borderRadius: 10, width: '100%',
          background: isActive ? C.accentBg : 'transparent',
          border: isActive ? `1px solid ${C.accent}30` : '1px solid transparent',
          color: item.soon ? C.border : isActive ? C.accent : C.text,
          cursor: item.soon ? 'default' : 'pointer',
          fontFamily: fn, fontSize: 14, fontWeight: isActive ? 600 : 500,
          textAlign: 'left' as const,
        }}
      >
        <span style={{ fontSize: 16 }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.soon && <span style={{ fontSize: 10, fontWeight: 600, color: C.soft, background: C.secondary, padding: '2px 7px', borderRadius: 10 }}>breve</span>}
      </button>
    );
  }

  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: fnTitle, fontSize: 13, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>Portal do Cliente</div>
            <div style={{ fontSize: 12, color: C.soft, marginTop: 1 }}>{clientName}</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleNav.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <button
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', width: '100%', background: 'transparent', border: '1px solid transparent', borderRadius: 10, cursor: 'pointer', fontFamily: fn, fontSize: 13, color: C.soft, textAlign: 'left' as const }}
        >
          <span>↩</span> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: fn, display: 'flex' }}>

      {/* Sidebar — desktop */}
      {!isMobile && (
        <aside style={{ width: 240, minHeight: '100vh', background: C.card, borderRight: `1px solid ${C.border}`, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
          {sidebarContent}
        </aside>
      )}

      {/* Mobile header */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: C.card, borderBottom: `1px solid ${C.border}`, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L14.5 9.5H22L16 14L18.5 21.5L12 17L5.5 21.5L8 14L2 9.5H9.5L12 2Z" fill="white" />
              </svg>
            </div>
            <span style={{ fontFamily: fnTitle, fontSize: 14, fontWeight: 600, color: C.text }}>Portal do Cliente</span>
          </div>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: C.text, fontSize: 18 }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>
      )}

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)}>
          <div style={{ position: 'absolute', top: 60, left: 0, bottom: 0, width: 260, background: C.card, borderRight: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main style={{ flex: 1, padding: isMobile ? '76px 16px 24px' : '32px 32px 32px', maxWidth: 720, minWidth: 0 }}>
        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: fnTitle, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: C.text, margin: '0 0 4px' }}>
            {visibleNav.find(n => n.id === currentTab)?.label || 'Visão Geral'}
          </h1>
          <p style={{ color: C.soft, fontSize: 13, margin: 0 }}>
            {clientName}
          </p>
        </div>

        {/* Tab content */}
        {currentTab === 'overview' && <OverviewTab slug={slug} clientName={clientName} />}
        {currentTab === 'requests' && <RequestsTab slug={slug} />}
        {currentTab === 'links' && <LinksTab slug={slug} />}
        {currentTab === 'reports' && <ComingSoon label="Relatórios" />}
        {currentTab === 'optimizations' && <ComingSoon label="Otimizações" />}
        {currentTab === 'content' && <ComingSoon label="Conteúdo" />}
      </main>
    </div>
  );
}
