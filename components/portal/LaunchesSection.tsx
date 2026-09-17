'use client';

import { useState, useEffect, useCallback } from 'react';

const LAUNCH_STATUS: Record<string, string> = { planejamento: 'Planejamento', em_andamento: 'Em andamento', concluido: 'Concluído', pausado: 'Pausado' };
const LAUNCH_STATUS_COLOR: Record<string, string> = { planejamento: 'rgba(255,255,255,0.4)', em_andamento: '#f59e0b', concluido: '#22c55e', pausado: '#94a3b8' };
const LINK_GROUPS = ['Páginas', 'Pastas e arquivos', 'Dashboards e planilhas', 'Referências'];

function formatDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

const emptyLaunch = { name: '', start_date: '', end_date: '', status: 'planejamento', sort_order: 0 };
const emptyPhase = { name: '', start_date: '', end_date: '', order_num: 0 };

export default function LaunchesSection({ clientId }: { clientId: string }) {
  const [launches, setLaunches] = useState<any[]>([]);
  const [selLaunch, setSelLaunch] = useState<any>(null);
  const [launchDetail, setLaunchDetail] = useState<any>(null);
  const [launchLinks, setLaunchLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Launch form
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const [launchForm, setLaunchForm] = useState({ ...emptyLaunch });
  const [editLaunchId, setEditLaunchId] = useState<string | null>(null);
  const [lSaving, setLSaving] = useState(false);

  // Goals / Results / Debrief editing
  const [goalsText, setGoalsText] = useState('');
  const [resultsText, setResultsText] = useState('');
  const [debriefText, setDebriefText] = useState('');
  const [jrSaving, setJrSaving] = useState(false);

  // Phase form
  const [showPhaseForm, setShowPhaseForm] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ ...emptyPhase });
  const [editPhaseId, setEditPhaseId] = useState<string | null>(null);
  const [pSaving, setPSaving] = useState(false);

  // Link form
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ group_name: 'Referências', label: '', url: '', description: '', tag: '' });
  const [linkSaving, setLinkSaving] = useState(false);

  const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
  const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px' };
  const btnPrimary = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 9, padding: '8px 16px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnDanger = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 11px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
  const btnGhost = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

  const api = useCallback(async (body: any) => {
    return fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/portal/manage?client_id=${clientId}&section=launches`);
    const data = await res.json();
    setLaunches(data.launches || []);
    setLoading(false);
  }, [clientId]);

  const loadDetail = useCallback(async (launchId: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/portal/manage?client_id=${clientId}&section=launches&launch_id=${launchId}`);
    const data = await res.json();
    setLaunchDetail(data.launch || null);
    setLaunchLinks(data.links || []);
    if (data.launch) {
      setGoalsText(JSON.stringify(data.launch.goals || {}, null, 2));
      setResultsText(JSON.stringify(data.launch.results || {}, null, 2));
      setDebriefText(JSON.stringify(data.launch.debrief || {}, null, 2));
    }
    setDetailLoading(false);
  }, [clientId]);

  useEffect(() => { loadList(); }, [loadList]);

  function selectLaunch(l: any) {
    setSelLaunch(l);
    loadDetail(l.id);
    setShowLaunchForm(false);
    setShowPhaseForm(false);
    setShowLinkForm(false);
  }

  // ── Launch CRUD ─────────────────────────────────────────
  function openAddLaunch() {
    setEditLaunchId(null);
    setLaunchForm({ ...emptyLaunch });
    setShowLaunchForm(true);
  }

  function openEditLaunch(l: any) {
    setEditLaunchId(l.id);
    setLaunchForm({ name: l.name, start_date: l.start_date || '', end_date: l.end_date || '', status: l.status, sort_order: l.sort_order });
    setShowLaunchForm(true);
  }

  async function saveLaunch() {
    if (!launchForm.name.trim()) return;
    setLSaving(true);
    const payload = editLaunchId
      ? { action: 'update_launch', launch_id: editLaunchId, ...launchForm, start_date: launchForm.start_date || null, end_date: launchForm.end_date || null }
      : { action: 'add_launch', client_id: clientId, ...launchForm, start_date: launchForm.start_date || null, end_date: launchForm.end_date || null };
    const res = await api(payload);
    setLSaving(false);
    if (res.ok) {
      setShowLaunchForm(false);
      setEditLaunchId(null);
      await loadList();
      if (editLaunchId && selLaunch?.id === editLaunchId) loadDetail(editLaunchId);
    }
  }

  async function removeLaunch(id: string) {
    if (!confirm('Remover este lançamento e todas as suas fases?')) return;
    await api({ action: 'remove_launch', launch_id: id });
    setLaunches(launches.filter(l => l.id !== id));
    if (selLaunch?.id === id) { setSelLaunch(null); setLaunchDetail(null); }
  }

  // ── JSON fields save ────────────────────────────────────
  async function saveJsonFields() {
    if (!selLaunch) return;
    setJrSaving(true);
    let goals = {}, results = {}, debrief = {};
    try { goals = JSON.parse(goalsText); } catch {}
    try { results = JSON.parse(resultsText); } catch {}
    try { debrief = JSON.parse(debriefText); } catch {}
    await api({ action: 'update_launch', launch_id: selLaunch.id, name: launchDetail.name, start_date: launchDetail.start_date || null, end_date: launchDetail.end_date || null, status: launchDetail.status, sort_order: launchDetail.sort_order, goals, results, debrief });
    setJrSaving(false);
  }

  // ── Phase CRUD ──────────────────────────────────────────
  function openAddPhase() {
    setEditPhaseId(null);
    setPhaseForm({ ...emptyPhase, order_num: (launchDetail?.portal_launch_phases?.length || 0) });
    setShowPhaseForm(true);
  }

  function openEditPhase(p: any) {
    setEditPhaseId(p.id);
    setPhaseForm({ name: p.name, start_date: p.start_date || '', end_date: p.end_date || '', order_num: p.order_num });
    setShowPhaseForm(true);
  }

  async function savePhase() {
    if (!phaseForm.name.trim()) return;
    setPSaving(true);
    const payload = editPhaseId
      ? { action: 'update_launch_phase', phase_id: editPhaseId, ...phaseForm, start_date: phaseForm.start_date || null, end_date: phaseForm.end_date || null }
      : { action: 'add_launch_phase', launch_id: selLaunch.id, ...phaseForm, start_date: phaseForm.start_date || null, end_date: phaseForm.end_date || null };
    await api(payload);
    setPSaving(false);
    setShowPhaseForm(false);
    setEditPhaseId(null);
    loadDetail(selLaunch.id);
  }

  async function removePhase(id: string) {
    await api({ action: 'remove_launch_phase', phase_id: id });
    loadDetail(selLaunch.id);
  }

  // ── Launch links CRUD ───────────────────────────────────
  async function addLaunchLink() {
    if (!linkForm.label.trim() || !linkForm.url.trim()) return;
    setLinkSaving(true);
    await api({ action: 'add_link', client_id: clientId, launch_id: selLaunch.id, ...linkForm, description: linkForm.description || null, tag: linkForm.tag || null });
    setLinkSaving(false);
    setShowLinkForm(false);
    setLinkForm({ group_name: 'Referências', label: '', url: '', description: '', tag: '' });
    loadDetail(selLaunch.id);
  }

  async function removeLaunchLink(id: string) {
    await api({ action: 'remove_link', link_id: id });
    setLaunchLinks(launchLinks.filter(l => l.id !== id));
  }

  if (loading) return <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>;

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Launch list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Lançamentos</span>
          <button onClick={openAddLaunch} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>+ Novo</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {launches.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Nenhum lançamento.</p>}
          {launches.map(l => (
            <button key={l.id} onClick={() => selectLaunch(l)} style={{ background: selLaunch?.id === l.id ? 'rgba(167,139,250,0.12)' : 'transparent', border: selLaunch?.id === l.id ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent', borderRadius: 7, padding: '8px 10px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: selLaunch?.id === l.id ? '#a5b4fc' : 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{l.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 10, color: LAUNCH_STATUS_COLOR[l.status] }}>{LAUNCH_STATUS[l.status]}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* New launch form */}
        {showLaunchForm && (
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{editLaunchId ? 'Editar lançamento' : 'Novo lançamento'}</p>
            <input value={launchForm.name} onChange={e => setLaunchForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Nome do lançamento *" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Início</label>
                <input type="date" value={launchForm.start_date} onChange={e => setLaunchForm(f => ({ ...f, start_date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Fim</label>
                <input type="date" value={launchForm.end_date} onChange={e => setLaunchForm(f => ({ ...f, end_date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Status</label>
                <select value={launchForm.status} onChange={e => setLaunchForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                  {Object.entries(LAUNCH_STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>Ordem</label>
                <input type="number" value={launchForm.sort_order} onChange={e => setLaunchForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} style={inp} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveLaunch} disabled={lSaving} style={{ ...btnPrimary, opacity: lSaving ? 0.7 : 1 }}>{lSaving ? 'Salvando...' : 'Salvar'}</button>
              <button onClick={() => { setShowLaunchForm(false); setEditLaunchId(null); }} style={btnGhost}>Cancelar</button>
            </div>
          </div>
        )}

        {!selLaunch && !showLaunchForm && (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Selecione ou crie um lançamento.</p>
        )}

        {selLaunch && !detailLoading && launchDetail && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e2e8f0' }}>{launchDetail.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: LAUNCH_STATUS_COLOR[launchDetail.status] }}>{LAUNCH_STATUS[launchDetail.status]} · {formatDate(launchDetail.start_date)} — {formatDate(launchDetail.end_date)}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEditLaunch(selLaunch)} style={btnGhost}>Editar</button>
                <button onClick={() => removeLaunch(selLaunch.id)} style={btnDanger}>Remover</button>
              </div>
            </div>

            {/* Phases */}
            <div style={cardS}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fases</p>
                <button onClick={openAddPhase} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>+ Fase</button>
              </div>
              {showPhaseForm && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={phaseForm.name} onChange={e => setPhaseForm(f => ({ ...f, name: e.target.value }))} style={inp} placeholder="Nome da fase *" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 8 }}>
                    <input type="date" value={phaseForm.start_date} onChange={e => setPhaseForm(f => ({ ...f, start_date: e.target.value }))} style={inp} />
                    <input type="date" value={phaseForm.end_date} onChange={e => setPhaseForm(f => ({ ...f, end_date: e.target.value }))} style={inp} />
                    <input type="number" value={phaseForm.order_num} onChange={e => setPhaseForm(f => ({ ...f, order_num: parseInt(e.target.value) || 0 }))} style={inp} placeholder="Ordem" />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={savePhase} disabled={pSaving} style={{ ...btnPrimary, opacity: pSaving ? 0.7 : 1, fontSize: 12, padding: '6px 14px' }}>{pSaving ? '...' : 'Salvar'}</button>
                    <button onClick={() => { setShowPhaseForm(false); setEditPhaseId(null); }} style={btnGhost}>Cancelar</button>
                  </div>
                </div>
              )}
              {(launchDetail.portal_launch_phases || []).length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Nenhuma fase ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(launchDetail.portal_launch_phases || []).map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{p.name}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 10 }}>{formatDate(p.start_date)} — {formatDate(p.end_date)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditPhase(p)} style={{ ...btnGhost, fontSize: 11, padding: '3px 9px' }}>Editar</button>
                        <button onClick={() => removePhase(p.id)} style={{ ...btnDanger, fontSize: 11, padding: '3px 9px' }}>Remover</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Goals / Results / Debrief (JSON textareas) */}
            <div style={cardS}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Metas, Resultados e Debrief</p>
                <button onClick={saveJsonFields} disabled={jrSaving} style={{ ...btnPrimary, opacity: jrSaving ? 0.7 : 1, fontSize: 11, padding: '5px 12px' }}>{jrSaving ? 'Salvando...' : 'Salvar'}</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Metas (JSON)', val: goalsText, set: setGoalsText },
                  { label: 'Resultados (JSON)', val: resultsText, set: setResultsText },
                  { label: 'Debrief (JSON)', val: debriefText, set: setDebriefText },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <textarea value={f.val} onChange={e => f.set(e.target.value)} style={{ ...inp, fontFamily: 'monospace', fontSize: 11, resize: 'vertical' as const }} rows={3} />
                  </div>
                ))}
              </div>
            </div>

            {/* Launch links */}
            <div style={cardS}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Links do Lançamento</p>
                <button onClick={() => setShowLinkForm(!showLinkForm)} style={{ ...btnGhost, fontSize: 11, padding: '4px 10px' }}>+ Link</button>
              </div>
              {showLinkForm && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 14px', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={linkForm.label} onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))} style={inp} placeholder="Nome *" />
                    <input value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} style={inp} placeholder="URL *" />
                    <input value={linkForm.description} onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Descrição" />
                    <input value={linkForm.tag} onChange={e => setLinkForm(f => ({ ...f, tag: e.target.value }))} style={inp} placeholder="Tag" />
                  </div>
                  <select value={linkForm.group_name} onChange={e => setLinkForm(f => ({ ...f, group_name: e.target.value }))} style={{ ...inp, width: 220 }}>
                    {LINK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={addLaunchLink} disabled={linkSaving} style={{ ...btnPrimary, opacity: linkSaving ? 0.7 : 1, fontSize: 12, padding: '6px 14px' }}>{linkSaving ? '...' : 'Salvar'}</button>
                    <button onClick={() => setShowLinkForm(false)} style={btnGhost}>Cancelar</button>
                  </div>
                </div>
              )}
              {launchLinks.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Nenhum link para este lançamento.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {launchLinks.map(l => (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{l.label}</p>
                        <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{l.url}</p>
                      </div>
                      <button onClick={() => removeLaunchLink(l.id)} style={{ ...btnDanger, fontSize: 11, padding: '3px 9px' }}>Remover</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {selLaunch && detailLoading && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>}
      </div>
    </div>
  );
}
