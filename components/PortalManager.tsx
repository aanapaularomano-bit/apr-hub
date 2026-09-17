'use client';

import { useState, useEffect, useCallback } from 'react';
import { slugify } from '@/lib/portalAuth';

const LINK_GROUPS = ['Páginas', 'Pastas e arquivos', 'Dashboards e planilhas', 'Referências'];
const REQUEST_STATUS = ['pendente', 'em_andamento', 'concluido', 'cancelado'];
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function PortalManager({
  clients,
  T,
}: {
  clients: any[];
  T: any;
  user?: any;
}) {
  const [selClient, setSelClient] = useState<any>(null);
  const [portal, setPortal] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'links' | 'requests'>('requests');

  // Create/edit form
  const [showSetup, setShowSetup] = useState(false);
  const [setupSlug, setSetupSlug] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupSaving, setSetupSaving] = useState(false);
  const [setupError, setSetupError] = useState('');

  // One-time password reveal
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Link form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ group_name: 'Referências', label: '', url: '' });
  const [linkSaving, setLinkSaving] = useState(false);

  // Request form
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm, setReqForm] = useState({ title: '', details: '', due_date: '' });
  const [reqSaving, setReqSaving] = useState(false);

  const loadPortal = useCallback(async (clientId: string) => {
    setLoading(true);
    setRevealedPassword(null);
    const res = await fetch(`/api/portal/manage?client_id=${clientId}`);
    const data = await res.json();
    setPortal(data.portal || null);
    setLinks(data.links || []);
    setRequests(data.requests || []);
    setLoading(false);
  }, []);

  function selectClient(c: any) {
    setSelClient(c);
    setShowSetup(false);
    setRevealedPassword(null);
    loadPortal(c.id);
  }

  function openSetup() {
    const slug = portal?.slug || slugify(selClient?.name || '');
    setSetupSlug(slug);
    setSetupPassword('');
    setSetupError('');
    setShowSetup(true);
  }

  async function saveSetup() {
    if (!setupSlug.trim()) { setSetupError('Slug obrigatório'); return; }
    if (!portal && !setupPassword.trim()) { setSetupError('Senha obrigatória para criar o portal'); return; }
    setSetupSaving(true);
    setSetupError('');
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upsert_portal',
        client_id: selClient.id,
        client_name: selClient.name,
        slug: setupSlug.trim(),
        password: setupPassword || (portal?.slug ? '__keep__' : ''),
      }),
    });
    setSetupSaving(false);
    if (res.ok) {
      setShowSetup(false);
      loadPortal(selClient.id);
    } else {
      const d = await res.json();
      setSetupError(d.error || 'Erro ao salvar');
    }
  }

  async function generatePassword() {
    if (!portal) return;
    setGenLoading(true);
    setRevealedPassword(null);
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_password', portal_id: portal.id }),
    });
    const data = await res.json();
    setGenLoading(false);
    if (data.password) setRevealedPassword(data.password);
  }

  async function toggleEnabled() {
    if (!portal) return;
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_enabled', portal_id: portal.id, enabled: !portal.enabled }),
    });
    if (res.ok) setPortal({ ...portal, enabled: !portal.enabled });
  }

  async function updateSections(key: string, val: boolean) {
    if (!portal) return;
    const newSections = { ...portal.sections, [key]: val };
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_sections', portal_id: portal.id, sections: newSections }),
    });
    if (res.ok) setPortal({ ...portal, sections: newSections });
  }

  async function addLink() {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return;
    setLinkSaving(true);
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_link', client_id: selClient.id, ...linkForm }),
    });
    setLinkSaving(false);
    if (res.ok) {
      setLinkForm({ group_name: 'Referências', label: '', url: '' });
      setShowLinkForm(false);
      loadPortal(selClient.id);
    }
  }

  async function removeLink(id: string) {
    await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_link', link_id: id }),
    });
    setLinks(links.filter(l => l.id !== id));
  }

  async function addRequest() {
    if (!reqForm.title.trim()) return;
    setReqSaving(true);
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_request', client_id: selClient.id, ...reqForm }),
    });
    setReqSaving(false);
    if (res.ok) {
      setReqForm({ title: '', details: '', due_date: '' });
      setShowReqForm(false);
      loadPortal(selClient.id);
    }
  }

  async function updateReqStatus(reqId: string, status: string) {
    await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_request', request_id: reqId, status }),
    });
    setRequests(requests.map(r => r.id === reqId ? { ...r, status } : r));
  }

  async function removeRequest(reqId: string) {
    await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_request', request_id: reqId }),
    });
    setRequests(requests.filter(r => r.id !== reqId));
  }

  function copyPassword() {
    if (!revealedPassword) return;
    navigator.clipboard.writeText(revealedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const portalUrl = portal ? `${window?.location?.origin || ''}/portal/${portal.slug}` : '';
  const sections = portal?.sections || { overview: true, requests: true, links: true };

  const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
  const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' };
  const btnPrimary = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 9, padding: '9px 16px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnDanger = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '6px 12px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnGhost = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

  return (
    <div style={{ display: 'flex', gap: 24, minHeight: 'calc(100vh - 80px)' }}>

      {/* Client list */}
      <aside style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
          Clientes
        </div>
        {clients.map(c => (
          <button
            key={c.id}
            onClick={() => selectClient(c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 12px', borderRadius: 9, width: '100%',
              background: selClient?.id === c.id ? 'rgba(167,139,250,0.12)' : 'transparent',
              border: selClient?.id === c.id ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent',
              color: selClient?.id === c.id ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'left' as const,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.name}</span>
          </button>
        ))}
      </aside>

      {/* Main panel */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selClient ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, paddingTop: 20 }}>
            Selecione um cliente para gerenciar o portal.
          </div>
        ) : loading ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, paddingTop: 20 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>{selClient.name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  Portal do cliente
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {portal && (
                  <a
                    href={`/portal/${portal.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ ...btnPrimary, textDecoration: 'none', fontSize: 12 }}
                  >
                    👁 Ver como cliente
                  </a>
                )}
                <button onClick={openSetup} style={btnPrimary}>
                  {portal ? '✏️ Editar portal' : '+ Criar portal'}
                </button>
              </div>
            </div>

            {/* Setup form */}
            {showSetup && (
              <div style={{ ...cardS, border: '1px solid rgba(167,139,250,0.3)' }}>
                <p style={{ margin: '0 0 14px', fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>
                  {portal ? 'Editar portal' : 'Criar portal'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>SLUG (aparece na URL)</label>
                    <input value={setupSlug} onChange={e => setSetupSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} style={inp} placeholder="nome-do-cliente" />
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/portal/{setupSlug || '...'}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>
                      {portal ? 'NOVA SENHA (deixe vazio para manter a atual)' : 'SENHA *'}
                    </label>
                    <input type="password" value={setupPassword} onChange={e => setSetupPassword(e.target.value)} style={inp} placeholder={portal ? 'Nova senha (opcional)' : 'Senha de acesso'} />
                  </div>
                </div>
                {setupError && <p style={{ color: '#ef4444', fontSize: 12, margin: '8px 0 0' }}>{setupError}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button onClick={saveSetup} disabled={setupSaving} style={{ ...btnPrimary, opacity: setupSaving ? 0.7 : 1 }}>
                    {setupSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowSetup(false)} style={btnGhost}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Portal info */}
            {portal && !showSetup && (
              <div style={cardS}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                  {/* Status + link */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={toggleEnabled} style={{ background: portal.enabled ? '#22c55e20' : '#ef444420', border: `1px solid ${portal.enabled ? '#22c55e40' : '#ef444440'}`, borderRadius: 20, padding: '4px 14px', color: portal.enabled ? '#22c55e' : '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
                        {portal.enabled ? '● Ativo' : '○ Inativo'}
                      </button>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>clique para alternar</span>
                    </div>
                    {portal.last_visit_at && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                        Último acesso: {formatDate(portal.last_visit_at?.slice(0, 10))}
                      </span>
                    )}
                  </div>

                  {/* URL */}
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>LINK DO PORTAL</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input readOnly value={portalUrl} style={{ ...inp, color: 'rgba(255,255,255,0.5)', cursor: 'text' }} />
                      <button onClick={() => { navigator.clipboard.writeText(portalUrl); }} style={{ ...btnPrimary, flexShrink: 0, fontSize: 12 }}>
                        Copiar
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 6 }}>SENHA</label>
                    {revealedPassword ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <code style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 14px', color: '#86efac', fontSize: 16, fontFamily: 'monospace', letterSpacing: '0.12em', flex: 1 }}>
                          {revealedPassword}
                        </code>
                        <button onClick={copyPassword} style={{ ...btnPrimary, flexShrink: 0, fontSize: 12 }}>
                          {copied ? '✓ Copiado' : 'Copiar'}
                        </button>
                        <button onClick={() => setRevealedPassword(null)} style={btnGhost}>Fechar</button>
                      </div>
                    ) : (
                      <button onClick={generatePassword} disabled={genLoading} style={{ ...btnPrimary, opacity: genLoading ? 0.7 : 1 }}>
                        {genLoading ? 'Gerando...' : '🔑 Gerar nova senha'}
                      </button>
                    )}
                    {revealedPassword && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: '#f59e0b' }}>
                        ⚠ Esta senha só aparece uma vez. Copie e repasse ao cliente.
                      </p>
                    )}
                  </div>

                  {/* Sections */}
                  <div>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 8 }}>SEÇÕES VISÍVEIS</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { key: 'overview', label: 'Visão Geral' },
                        { key: 'requests', label: 'Solicitações' },
                        { key: 'links', label: 'Links e Arquivos' },
                      ].map(s => (
                        <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                          <input
                            type="checkbox"
                            checked={sections[s.key as keyof typeof sections] !== false}
                            onChange={e => updateSections(s.key, e.target.checked)}
                            style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#a78bfa' }}
                          />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* No portal yet */}
            {!portal && !showSetup && (
              <div style={{ ...cardS, textAlign: 'center', padding: '32px 24px' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: '0 0 14px' }}>
                  Este cliente ainda não tem portal ativo.
                </p>
                <button onClick={openSetup} style={btnPrimary}>+ Criar portal</button>
              </div>
            )}

            {/* Tabs: Links & Requests */}
            {portal && (
              <>
                <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
                  {(['requests', 'links'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{ background: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #a78bfa' : '2px solid transparent', padding: '8px 16px', color: tab === t ? '#a78bfa' : 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                      {t === 'requests' ? 'Solicitações' : 'Links'}
                    </button>
                  ))}
                </div>

                {/* Requests tab */}
                {tab === 'requests' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowReqForm(!showReqForm)} style={btnPrimary}>
                        + Novo pedido ao cliente
                      </button>
                    </div>

                    {showReqForm && (
                      <div style={{ ...cardS, border: '1px solid rgba(167,139,250,0.3)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input value={reqForm.title} onChange={e => setReqForm(f => ({ ...f, title: e.target.value }))} style={inp} placeholder="Título da solicitação *" />
                          <textarea value={reqForm.details} onChange={e => setReqForm(f => ({ ...f, details: e.target.value }))} style={{ ...inp, resize: 'vertical' as const }} rows={2} placeholder="Detalhes (opcional)" />
                          <input type="date" value={reqForm.due_date} onChange={e => setReqForm(f => ({ ...f, due_date: e.target.value }))} style={inp} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={addRequest} disabled={reqSaving} style={{ ...btnPrimary, opacity: reqSaving ? 0.7 : 1 }}>
                            {reqSaving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setShowReqForm(false)} style={btnGhost}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    {requests.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nenhuma solicitação ainda.</p>
                    ) : (
                      requests.map(req => (
                        <div key={req.id} style={cardS}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{req.title}</span>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: req.from === 'agency' ? 'rgba(167,139,250,0.15)' : 'rgba(34,197,94,0.12)', color: req.from === 'agency' ? '#a78bfa' : '#22c55e' }}>
                                  {req.from === 'agency' ? 'Agência → Cliente' : 'Cliente → Agência'}
                                </span>
                              </div>
                              {req.details && <p style={{ margin: '0 0 4px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{req.details}</p>}
                              {req.due_date && <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Prazo: {formatDate(req.due_date)}</p>}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                              <select
                                value={req.status}
                                onChange={e => updateReqStatus(req.id, e.target.value)}
                                style={{ ...inp, width: 'auto', fontSize: 11, padding: '5px 8px' }}
                              >
                                {REQUEST_STATUS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                              </select>
                              <button onClick={() => removeRequest(req.id)} style={btnDanger}>Remover</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Links tab */}
                {tab === 'links' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => setShowLinkForm(!showLinkForm)} style={btnPrimary}>
                        + Adicionar link
                      </button>
                    </div>

                    {showLinkForm && (
                      <div style={{ ...cardS, border: '1px solid rgba(167,139,250,0.3)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <select value={linkForm.group_name} onChange={e => setLinkForm(f => ({ ...f, group_name: e.target.value }))} style={inp}>
                            {LINK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <input value={linkForm.label} onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))} style={inp} placeholder="Nome do link *" />
                          <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} style={inp} placeholder="URL *" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button onClick={addLink} disabled={linkSaving} style={{ ...btnPrimary, opacity: linkSaving ? 0.7 : 1 }}>
                            {linkSaving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setShowLinkForm(false)} style={btnGhost}>Cancelar</button>
                        </div>
                      </div>
                    )}

                    {links.length === 0 ? (
                      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Nenhum link cadastrado.</p>
                    ) : (
                      LINK_GROUPS.filter(g => links.some(l => l.group_name === g)).map(group => (
                        <div key={group}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{group}</p>
                          {links.filter(l => l.group_name === group).map(link => (
                            <div key={link.id} style={{ ...cardS, marginBottom: 6, padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{link.label}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{link.url}</p>
                                </div>
                                <button onClick={() => removeLink(link.id)} style={btnDanger}>Remover</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
