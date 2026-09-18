'use client';

import React, { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Report       = { id: string; kind: string; ref_date: string; title: string; content: string | null };
type Task         = { id: string; title: string; owner: string; status: string; note: string | null; due_date: string | null };
type Link         = { id: string; group_name: string; label: string; url: string };
type Launch       = { id: string; name: string; period: string | null; status: string; metrics: string | null; content: string | null; phases?: {name:string;start:string;end:string}[]; goals?: {label:string;current:number;target:number;unit:string}[]; launch_links?: {label:string;url:string}[]; ideas?: {title:string;description:string}[]; launch_optimizations?: {date:string;action:string;result:string}[]; learnings?: string|null; previous_data?: {name:string;kpis:{label:string;value:string}[]}|null; sheet_url?: string|null; current_phase?: number };
type Optimization = { id: string; date: string; type: string; campaign: string | null; action: string; reason: string | null; result: string };
type Request      = { id: string; from_who: string; title: string; status: string; note: string | null; created_at: string };
type Content      = { id: string; title: string; format: string | null; sent_date: string | null; status: string; hook_rate: string | null; ctr: string | null; cpl: string | null; notes: string | null };

// ─── Constants ────────────────────────────────────────────────────────────────
const TS_LBL:   Record<string,string> = { a_fazer:'A fazer', fazendo:'Fazendo', feito:'Feito', nao_feito:'Não feito' };
const TS_CYCLE: Record<string,string> = { a_fazer:'fazendo', fazendo:'feito', feito:'nao_feito', nao_feito:'a_fazer' };
const TS_ORDER = ['a_fazer','fazendo','feito','nao_feito'];
const OW_LBL:   Record<string,string> = { agencia:'Agência', cliente:'Cliente' };
const KIND_LBL: Record<string,string> = { diario:'Diário', semanal:'Semanal', mensal:'Mensal' };
const LS_LBL:   Record<string,string> = { planejamento:'Planejamento', em_andamento:'Em andamento', concluido:'Concluído', pausado:'Pausado' };
const RS_LBL:   Record<string,string> = { em_andamento:'Em andamento', aguardando_voce:'Aguardando você', concluido:'Concluído', recebido:'Recebido' };
const CS_LBL:   Record<string,string> = { no_ar:'No ar', pausado:'Pausado', recebido:'Recebido', aguardando_envio:'Aguardando envio' };
const OPT_TYPES = ['Orçamento','Criativo','Público','Pausa','Teste','Página','Outro'];

function rsTag(s: string)  { return s==='concluido'?'ok':s==='aguardando_voce'?'warn':s==='em_andamento'?'acc':''; }
function csTag(s: string)  { return s==='no_ar'?'ok':s==='pausado'?'bad':s==='recebido'?'acc':'warn'; }
function lsTag(s: string)  { return s==='concluido'?'ok':s==='pausado'?'bad':s==='em_andamento'?'warn':'acc'; }
function resTag(r: string) { return r==='ok'?'ok':r==='bad'?'bad':'warn'; }
function resLbl(r: string) { return r==='ok'?'Funcionou':r==='bad'?'Não funcionou':'Em observação'; }
function kindTag(k: string) { return k==='mensal'?'ok':k==='semanal'?'acc':''; }

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const [y,m,d] = iso.slice(0,10).split('-');
  return `${d}/${m}/${y}`;
}

async function apiFetch(method: string, resource: string, slug: string, body?: Record<string,unknown>, extra?: Record<string,string>) {
  const qs = new URLSearchParams({ slug, ...extra });
  const r = await fetch(`/api/portal/${resource}?${qs}`, {
    method,
    headers: body ? { 'Content-Type':'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  return r.json();
}

// ─── Shared UI Primitives ─────────────────────────────────────────────────────
function Tag({ v, children }: { v?: string; children: React.ReactNode }) {
  return <span className={`tag${v?' '+v:''}`}>{children}</span>;
}

function EmptyState({ msg, action }: { msg: string; action?: React.ReactNode }) {
  return (
    <div className="panel" style={{ textAlign:'center', padding:'40px 24px' }}>
      <p className="muted" style={{ marginBottom: action ? 14 : 0 }}>{msg}</p>
      {action}
    </div>
  );
}

function InlineForm({ children, onSubmit }: { children: React.ReactNode; onSubmit: (e:React.FormEvent)=>void }) {
  return (
    <div className="panel" style={{ marginBottom:20 }}>
      <form className="form-grid" onSubmit={onSubmit}>{children}</form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field">{label && <label>{label}</label>}{children}</div>;
}

function FullField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field full">{label && <label>{label}</label>}{children}</div>;
}

// ─── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ slug, onLogin }: { slug: string; onLogin: (role: string) => void }) {
  const [pw, setPw]     = useState('');
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/portal/login?slug=${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ slug, password: pw }),
        credentials: 'include',
      });
      const d = await r.json();
      if (d.role) { onLogin(d.role); }
      else { setErr(d.error ?? 'Senha incorreta'); }
    } catch { setErr('Erro de conexão. Tente novamente.'); }
    setBusy(false);
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="brand">APR Digital</div>
        <h1>Portal do cliente</h1>
        <p className="muted">Acompanhe relatórios, tarefas, solicitações e lançamentos do seu projeto.</p>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="pw">Senha de acesso</label>
            <input className="input" id="pw" type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="Senha enviada pela agência"/>
          </div>
          {err && <p className="small" style={{ color:'var(--bad)', margin:0 }}>{err}</p>}
          <button className="btn" type="submit">{busy ? 'Verificando...' : 'Entrar na central'}</button>
        </form>
      </div>
    </div>
  );
}

// ─── Section: Visão Geral ─────────────────────────────────────────────────────
function OverviewSection({ slug }: { slug: string }) {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [reports,  setReports]  = useState<Report[]>([]);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('GET','tasks',slug),
      apiFetch('GET','reports',slug),
      apiFetch('GET','launches',slug),
    ]).then(([t,r,l]) => {
      setTasks(t.tasks ?? []);
      setReports(r.reports ?? []);
      setLaunches(l.launches ?? []);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <p className="muted small">Carregando...</p>;

  const needs  = tasks.filter(t => t.owner==='cliente' && ['a_fazer','fazendo'].includes(t.status));
  const activeL = launches.filter(l => l.status==='em_andamento');
  const recentR = reports.slice(0,3);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="period">Resumo da sua conta</div>
          <h1>Visão geral</h1>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="l">Tarefas pendentes</div><div className="v">{tasks.filter(t=>['a_fazer','fazendo'].includes(t.status)).length}</div></div>
        <div className="kpi"><div className="l">Precisa de você</div><div className="v">{needs.length}</div></div>
        <div className="kpi"><div className="l">Lançamentos ativos</div><div className="v">{activeL.length}</div></div>
        <div className="kpi"><div className="l">Relatórios</div><div className="v">{reports.length}</div></div>
      </div>

      {needs.length > 0 && (
        <section className="needs" style={{ marginTop:28 }}>
          <h2>O que precisamos de você</h2>
          <p className="small muted">Esses itens estão aguardando a sua ação para avançarmos.</p>
          {needs.map(n => (
            <div key={n.id} className="need">
              <div>
                <h3>{n.title}</h3>
                {n.note && <p className="small muted">{n.note}</p>}
              </div>
              <div style={{ textAlign:'right' }}>
                {n.due_date && <div className="due">{fmtDate(n.due_date)}</div>}
                <Tag v="warn">{TS_LBL[n.status]}</Tag>
              </div>
            </div>
          ))}
        </section>
      )}

      {activeL.length > 0 && (
        <section style={{ marginTop:28 }}>
          <div className="section-head"><h2>Lançamento em andamento</h2></div>
          <div className="rows">
            {activeL.map(l => (
              <div key={l.id} className="row">
                <div className="row-top">
                  <h3>{l.name}</h3>
                  <Tag v="warn">Em andamento</Tag>
                </div>
                {l.period && <p className="small muted">{l.period}</p>}
                {l.metrics && <p className="small muted mono">{l.metrics}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {recentR.length > 0 && (
        <section style={{ marginTop:28 }}>
          <div className="section-head"><h2>Últimos relatórios</h2></div>
          <div className="rows">
            {recentR.map(r => (
              <div key={r.id} className="row">
                <div className="row-top">
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <Tag v={kindTag(r.kind)}>{KIND_LBL[r.kind]}</Tag>
                    <span>{r.title}</span>
                  </div>
                  <span className="small muted mono">{fmtDate(r.ref_date)}</span>
                </div>
                {r.content && <p className="small muted">{r.content.slice(0,120)}{r.content.length>120?'…':''}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {needs.length===0 && activeL.length===0 && recentR.length===0 && (
        <EmptyState msg="Nenhum dado disponível ainda. A agência publicará relatórios e tarefas em breve."/>
      )}
    </>
  );
}

// ─── Section: Relatórios (filtra por kind) ────────────────────────────────────
function ReportsSection({ slug, isAdmin, kind, title, period }: {
  slug: string; isAdmin: boolean; kind: string; title: string; period: string;
}) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Report|null>(null);
  const [form, setForm] = useState({ ref_date:'', title:'', content:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET','reports',slug);
    const all: Report[] = d.reports ?? [];
    setReports(all.filter(r => r.kind === kind));
    setLoading(false);
  }, [slug, kind]);

  useEffect(() => { load(); }, [load]);

  function openNew() { setForm({ ref_date:'', title:'', content:'' }); setEditing(null); setShowForm(true); }
  function openEdit(r: Report) { setForm({ ref_date:r.ref_date, title:r.title, content:r.content??'' }); setEditing(r); setShowForm(true); }
  function cancel() { setShowForm(false); setEditing(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.title||!form.ref_date) return;
    setSaving(true);
    if (editing) { await apiFetch('PUT','reports',slug,{id:editing.id,kind,...form}); }
    else { await apiFetch('POST','reports',slug,{kind,...form}); }
    setSaving(false); cancel(); await load();
  }

  async function del(r: Report) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await apiFetch('DELETE','reports',slug,{id:r.id}); await load();
  }

  return (
    <>
      <div className="page-head">
        <div><div className="period">{period}</div><h1>{title}</h1></div>
        {isAdmin && !showForm && <button className="btn btn-sm" onClick={openNew}>+ Novo</button>}
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          <FullField label="Título *">
            <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder={`Ex.: ${title} de agosto`}/>
          </FullField>
          <Field label="Data de referência *">
            <input className="input" type="date" value={form.ref_date} onChange={e=>setForm(f=>({...f,ref_date:e.target.value}))} required/>
          </Field>
          <FullField label="Conteúdo">
            <textarea className="input" value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} rows={5} placeholder="Resumo, observações ou link..."/>
          </FullField>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      {loading ? <p className="muted small">Carregando...</p>
        : reports.length===0
          ? <EmptyState msg={`Nenhum ${title.toLowerCase()} publicado ainda.`} action={isAdmin&&!showForm?<button className="btn btn-sm" onClick={openNew}>+ Novo</button>:undefined}/>
          : (
            <div className="rows">
              {reports.map(r=>(
                <div key={r.id} className="row">
                  <div className="row-top">
                    <div style={{ display:'flex',gap:8,alignItems:'center',flexWrap:'wrap' }}>
                      <span className="small muted mono">{fmtDate(r.ref_date)}</span>
                      <strong>{r.title}</strong>
                    </div>
                    {isAdmin && (
                      <div style={{ display:'flex',gap:6 }}>
                        <button className="btn-ghost btn-sm" onClick={()=>openEdit(r)}>Editar</button>
                        <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(r)}>Excluir</button>
                      </div>
                    )}
                  </div>
                  {r.content && <p className="small muted" style={{ marginTop:6,whiteSpace:'pre-wrap' }}>{r.content}</p>}
                </div>
              ))}
            </div>
          )
      }
    </>
  );
}

// ─── Section: Diário de Otimizações ──────────────────────────────────────────
function OptimizationsSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [items, setItems]   = useState<Optimization[]>([]);
  const [loading, setLoad]  = useState(true);
  const [filter, setFilter] = useState('Todos');
  const [showForm, setShow] = useState(false);
  const [editing, setEdit]  = useState<Optimization|null>(null);
  const [form, setForm]     = useState({ date:'', type:OPT_TYPES[0], campaign:'', action:'', reason:'', result:'obs' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','optimizations',slug);
    setItems(d.optimizations ?? []);
    setLoad(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  function openNew() { setForm({date:'',type:OPT_TYPES[0],campaign:'',action:'',reason:'',result:'obs'}); setEdit(null); setShow(true); }
  function openEdit(o: Optimization) { setForm({date:o.date,type:o.type,campaign:o.campaign??'',action:o.action,reason:o.reason??'',result:o.result}); setEdit(o); setShow(true); }
  function cancel() { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.date||!form.action) return;
    setSaving(true);
    const body = {...form,campaign:form.campaign||null,reason:form.reason||null};
    if (editing) { await apiFetch('PUT','optimizations',slug,{id:editing.id,...body}); }
    else { await apiFetch('POST','optimizations',slug,body); }
    setSaving(false); cancel(); await load();
  }

  async function del(o: Optimization) {
    if (!confirm('Excluir esta otimização?')) return;
    await apiFetch('DELETE','optimizations',slug,{id:o.id}); await load();
  }

  const types = ['Todos',...OPT_TYPES];
  const visible = filter==='Todos' ? items : items.filter(o=>o.type===filter);
  const byDate: Record<string,Optimization[]> = {};
  visible.forEach(o=>{ (byDate[o.date]=byDate[o.date]||[]).push(o); });

  return (
    <>
      <div className="page-head">
        <div><div className="period">Registro de tudo que mexemos na sua conta</div><h1>Diário de otimizações</h1></div>
        {isAdmin && !showForm && <button className="btn btn-sm" onClick={openNew}>+ Registrar</button>}
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          <Field label="Data *"><input className="input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required/></Field>
          <Field label="Tipo">
            <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
              {OPT_TYPES.map(t=><option key={t}>{t}</option>)}
            </select>
          </Field>
          <FullField label="Campanha / Conjunto">
            <input className="input" value={form.campaign} onChange={e=>setForm(f=>({...f,campaign:e.target.value}))} placeholder="Nome da campanha ou conjunto"/>
          </FullField>
          <FullField label="O que foi feito *">
            <input className="input" value={form.action} onChange={e=>setForm(f=>({...f,action:e.target.value}))} required placeholder="Ex.: Aumentamos o orçamento de R$ 600 para R$ 780/dia"/>
          </FullField>
          <FullField label="Por quê">
            <input className="input" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} placeholder="Motivo da decisão"/>
          </FullField>
          <Field label="Resultado">
            <select className="input" value={form.result} onChange={e=>setForm(f=>({...f,result:e.target.value}))}>
              <option value="obs">Em observação</option>
              <option value="ok">Funcionou</option>
              <option value="bad">Não funcionou</option>
            </select>
          </Field>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      <div className="filters" role="group">
        {types.map(t=>(
          <button key={t} className="chip" aria-pressed={filter===t} onClick={()=>setFilter(t)}>{t}</button>
        ))}
      </div>

      {loading ? <p className="muted small">Carregando...</p>
        : visible.length===0
          ? <EmptyState msg="Nenhuma otimização registrada ainda."/>
          : (
            <div className="timeline">
              {Object.entries(byDate).map(([date,opts])=>(
                <React.Fragment key={date}>
                  <div className="tl-day mono">{fmtDate(date)}</div>
                  {opts.map(o=>(
                    <div key={o.id} className="tl-item">
                      <div className="row-top">
                        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                          <Tag>{o.type}</Tag>
                          {o.campaign && <span className="small muted">{o.campaign}</span>}
                        </div>
                        <div style={{ display:'flex',gap:6,alignItems:'center' }}>
                          <Tag v={resTag(o.result)}>{resLbl(o.result)}</Tag>
                          {isAdmin && <>
                            <button className="btn-ghost btn-sm" onClick={()=>openEdit(o)}>Editar</button>
                            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(o)}>Excluir</button>
                          </>}
                        </div>
                      </div>
                      <h3>{o.action}</h3>
                      {o.reason && <p className="why">{o.reason}</p>}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )
      }
    </>
  );
}

// ─── Section: Tarefas ─────────────────────────────────────────────────────────
function TasksSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoad]  = useState(true);
  const [showForm, setShow] = useState(false);
  const [editing, setEdit]  = useState<Task|null>(null);
  const [form, setForm]     = useState({ title:'', owner:'agencia', status:'a_fazer', note:'', due_date:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','tasks',slug);
    setTasks(d.tasks ?? []); setLoad(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  function openNew() { setForm({title:'',owner:'agencia',status:'a_fazer',note:'',due_date:''}); setEdit(null); setShow(true); }
  function openEdit(t: Task) { setForm({title:t.title,owner:t.owner,status:t.status,note:t.note??'',due_date:t.due_date??''}); setEdit(t); setShow(true); }
  function cancel() { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.title) return;
    setSaving(true);
    const body = {...form,due_date:form.due_date||null,note:form.note||null};
    if (editing) { await apiFetch('PUT','tasks',slug,{id:editing.id,...body}); }
    else { await apiFetch('POST','tasks',slug,body); }
    setSaving(false); cancel(); await load();
  }

  async function cycle(t: Task) {
    await apiFetch('PUT','tasks',slug,{id:t.id,status:TS_CYCLE[t.status]??'a_fazer'}); await load();
  }

  async function del(t: Task) {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    await apiFetch('DELETE','tasks',slug,{id:t.id}); await load();
  }

  const byStatus: Record<string,Task[]> = {};
  TS_ORDER.forEach(s=>{ byStatus[s]=tasks.filter(t=>t.status===s); });

  return (
    <>
      <div className="page-head">
        <div><div className="period">Quem faz o quê e até quando</div><h1>Tarefas</h1></div>
        {isAdmin && !showForm && <button className="btn btn-sm" onClick={openNew}>+ Nova tarefa</button>}
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          <FullField label="Tarefa *">
            <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="Descreva a tarefa"/>
          </FullField>
          <Field label="Responsável">
            <select className="input" value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))}>
              <option value="agencia">Agência</option>
              <option value="cliente">Cliente</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              {TS_ORDER.map(s=><option key={s} value={s}>{TS_LBL[s]}</option>)}
            </select>
          </Field>
          <Field label="Data limite">
            <input className="input" type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))}/>
          </Field>
          <FullField label="Observação">
            <textarea className="input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} placeholder="Detalhes adicionais..."/>
          </FullField>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      {loading ? <p className="muted small">Carregando...</p>
        : tasks.length===0
          ? <EmptyState msg="Nenhuma tarefa cadastrada ainda." action={isAdmin&&!showForm?<button className="btn btn-sm" onClick={openNew}>+ Nova tarefa</button>:undefined}/>
          : (
            <div className="kanban">
              {TS_ORDER.map(s=>(
                <div key={s} className="col">
                  <h3>{TS_LBL[s]}<span>{byStatus[s].length}</span></h3>
                  {byStatus[s].map(t=>(
                    <div key={t.id} className="card">
                      <div>{t.title}</div>
                      <div className="foot">
                        <Tag v={t.owner==='agencia'?'acc':'warn'}>{OW_LBL[t.owner]}</Tag>
                        {t.due_date && <span className="small muted mono">{fmtDate(t.due_date)}</span>}
                      </div>
                      {t.note && <p className="small muted">{t.note}</p>}
                      {isAdmin && (
                        <div style={{ display:'flex',gap:4,marginTop:4 }}>
                          <button className="btn-ghost btn-sm" onClick={()=>cycle(t)}>Avançar</button>
                          <button className="btn-ghost btn-sm" onClick={()=>openEdit(t)}>Editar</button>
                          <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(t)}>✕</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
      }
    </>
  );
}

// ─── Section: Solicitações ────────────────────────────────────────────────────
function RequestsSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [items, setItems]   = useState<Request[]>([]);
  const [loading, setLoad]  = useState(true);
  const [showForm, setShow] = useState(false);
  const [editing, setEdit]  = useState<Request|null>(null);
  const [form, setForm]     = useState({ from_who:'cliente', title:'', status:'em_andamento', note:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','requests',slug);
    setItems(d.requests ?? []); setLoad(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  function openNew()       { setForm({from_who:isAdmin?'agencia':'cliente',title:'',status:'em_andamento',note:''}); setEdit(null); setShow(true); }
  function openEdit(r: Request) { setForm({from_who:r.from_who,title:r.title,status:r.status,note:r.note??''}); setEdit(r); setShow(true); }
  function cancel()        { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.title) return;
    setSaving(true);
    const body = {...form,note:form.note||null};
    if (editing) { await apiFetch('PUT','requests',slug,{id:editing.id,...body}); }
    else { await apiFetch('POST','requests',slug,body); }
    setSaving(false); cancel(); await load();
  }

  async function del(r: Request) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await apiFetch('DELETE','requests',slug,{id:r.id}); await load();
  }

  const agency = items.filter(r=>r.from_who==='agencia');
  const client = items.filter(r=>r.from_who==='cliente');

  return (
    <>
      <div className="page-head">
        <div><div className="period">Pedidos entre a sua equipe e a agência</div><h1>Solicitações</h1></div>
        <button className="btn btn-sm" onClick={()=>showForm?cancel():openNew()}>{showForm?'Fechar':'Nova solicitação'}</button>
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          {isAdmin && (
            <Field label="De quem">
              <select className="input" value={form.from_who} onChange={e=>setForm(f=>({...f,from_who:e.target.value}))}>
                <option value="agencia">Agência pediu ao cliente</option>
                <option value="cliente">Cliente pediu à agência</option>
              </select>
            </Field>
          )}
          <FullField label="O que você precisa? *">
            <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="Ex.: Anúncio para a live de quinta"/>
          </FullField>
          {isAdmin && (
            <Field label="Status">
              <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option value="em_andamento">Em andamento</option>
                <option value="aguardando_voce">Aguardando você</option>
                <option value="concluido">Concluído</option>
                <option value="recebido">Recebido</option>
              </select>
            </Field>
          )}
          <FullField label="Detalhes">
            <textarea className="input" value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} placeholder="Links, referências, prazo desejado..."/>
          </FullField>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Enviando...':'Enviar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      {loading ? <p className="muted small">Carregando...</p>
        : items.length===0
          ? <EmptyState msg="Nenhuma solicitação ainda." action={!showForm?<button className="btn btn-sm" onClick={openNew}>Nova solicitação</button>:undefined}/>
          : (
            <div className="grid g2">
              <div>
                <h2 style={{ marginBottom:16 }}>Nós pedimos a você</h2>
                {agency.length===0 ? <p className="muted small">Sem pedidos da agência.</p> : (
                  <div className="rows">
                    {agency.map(r=>(
                      <div key={r.id} className="row">
                        <div className="row-top">
                          <h3>{r.title}</h3>
                          <Tag v={rsTag(r.status)}>{RS_LBL[r.status]}</Tag>
                        </div>
                        {r.note && <p className="small muted">{r.note}</p>}
                        {isAdmin && (
                          <div style={{ display:'flex',gap:6,marginTop:8 }}>
                            <button className="btn-ghost btn-sm" onClick={()=>openEdit(r)}>Editar</button>
                            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(r)}>Excluir</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h2 style={{ marginBottom:16 }}>Você pediu à agência</h2>
                {client.length===0 ? <p className="muted small">Sem pedidos do cliente.</p> : (
                  <div className="rows">
                    {client.map(r=>(
                      <div key={r.id} className="row">
                        <div className="row-top">
                          <h3>{r.title}</h3>
                          <Tag v={rsTag(r.status)}>{RS_LBL[r.status]}</Tag>
                        </div>
                        {r.note && <p className="small muted">{r.note}</p>}
                        {isAdmin && (
                          <div style={{ display:'flex',gap:6,marginTop:8 }}>
                            <button className="btn-ghost btn-sm" onClick={()=>openEdit(r)}>Editar</button>
                            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(r)}>Excluir</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
      }
    </>
  );
}

// ─── Section: Conteúdo ────────────────────────────────────────────────────────
function ContentSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [items, setItems]   = useState<Content[]>([]);
  const [loading, setLoad]  = useState(true);
  const [showForm, setShow] = useState(false);
  const [editing, setEdit]  = useState<Content|null>(null);
  const [form, setForm]     = useState({ title:'', format:'', sent_date:'', status:'aguardando_envio', hook_rate:'', ctr:'', cpl:'', notes:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','content',slug);
    setItems(d.content ?? []); setLoad(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  function openNew() { setForm({title:'',format:'',sent_date:'',status:'aguardando_envio',hook_rate:'',ctr:'',cpl:'',notes:''}); setEdit(null); setShow(true); }
  function openEdit(c: Content) { setForm({title:c.title,format:c.format??'',sent_date:c.sent_date??'',status:c.status,hook_rate:c.hook_rate??'',ctr:c.ctr??'',cpl:c.cpl??'',notes:c.notes??''}); setEdit(c); setShow(true); }
  function cancel() { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.title) return;
    setSaving(true);
    const body = {...form,format:form.format||null,sent_date:form.sent_date||null,hook_rate:form.hook_rate||null,ctr:form.ctr||null,cpl:form.cpl||null,notes:form.notes||null};
    if (editing) { await apiFetch('PUT','content',slug,{id:editing.id,...body}); }
    else { await apiFetch('POST','content',slug,body); }
    setSaving(false); cancel(); await load();
  }

  async function del(c: Content) {
    if (!confirm(`Excluir "${c.title}"?`)) return;
    await apiFetch('DELETE','content',slug,{id:c.id}); await load();
  }

  return (
    <>
      <div className="page-head">
        <div><div className="period">Distribuição de conteúdo nos anúncios</div><h1>Conteúdo</h1></div>
        {isAdmin && !showForm && <button className="btn btn-sm" onClick={openNew}>+ Nova peça</button>}
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          <FullField label="Título da peça *">
            <input className="input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="Ex.: Depoimento Marina"/>
          </FullField>
          <Field label="Formato">
            <input className="input" value={form.format} onChange={e=>setForm(f=>({...f,format:e.target.value}))} placeholder="Ex.: Vídeo 30s, Carrossel"/>
          </Field>
          <Field label="Data de envio">
            <input className="input" type="date" value={form.sent_date} onChange={e=>setForm(f=>({...f,sent_date:e.target.value}))}/>
          </Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
              <option value="aguardando_envio">Aguardando envio</option>
              <option value="recebido">Recebido</option>
              <option value="no_ar">No ar</option>
              <option value="pausado">Pausado</option>
            </select>
          </Field>
          <Field label="Hook rate">
            <input className="input" value={form.hook_rate} onChange={e=>setForm(f=>({...f,hook_rate:e.target.value}))} placeholder="Ex.: 38%"/>
          </Field>
          <Field label="CTR">
            <input className="input" value={form.ctr} onChange={e=>setForm(f=>({...f,ctr:e.target.value}))} placeholder="Ex.: 2,1%"/>
          </Field>
          <Field label="CPL / CPA">
            <input className="input" value={form.cpl} onChange={e=>setForm(f=>({...f,cpl:e.target.value}))} placeholder="Ex.: R$ 5,40"/>
          </Field>
          <FullField label="Brief / Observações">
            <textarea className="input" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={3} placeholder="Orientações de gravação, contexto, links..."/>
          </FullField>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      {loading ? <p className="muted small">Carregando...</p>
        : items.length===0
          ? <EmptyState msg="Nenhuma peça de conteúdo cadastrada ainda." action={isAdmin&&!showForm?<button className="btn btn-sm" onClick={openNew}>+ Nova peça</button>:undefined}/>
          : (
            <div className="table-wrap">
              <table className="t">
                <thead>
                  <tr>
                    <th>Peça</th><th>Formato</th><th>Enviada em</th><th>Status</th>
                    <th className="num">Hook rate</th><th className="num">CTR</th><th className="num">CPL</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map(c=>(
                    <tr key={c.id}>
                      <td><div>{c.title}</div>{c.notes&&<div className="small muted">{c.notes}</div>}</td>
                      <td className="muted">{c.format??'—'}</td>
                      <td className="mono">{fmtDate(c.sent_date)}</td>
                      <td><Tag v={csTag(c.status)}>{CS_LBL[c.status]}</Tag></td>
                      <td className="num">{c.hook_rate??'—'}</td>
                      <td className="num">{c.ctr??'—'}</td>
                      <td className="num">{c.cpl??'—'}</td>
                      {isAdmin && (
                        <td>
                          <div style={{ display:'flex',gap:4 }}>
                            <button className="btn-ghost btn-sm" onClick={()=>openEdit(c)}>Editar</button>
                            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(c)}>✕</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
      }
    </>
  );
}

// ─── Section: Lançamentos ─────────────────────────────────────────────────────
function fmtRange(s: string, e: string) {
  if (!s||!e) return '';
  const [,sm,sd] = s.split('-'); const [,em,ed] = e.split('-');
  return sm===em ? `${+sd} a ${+ed}/${sm}` : `${+sd}/${sm} a ${+ed}/${em}`;
}
function fmtGoal(g:{current:number;target:number;unit:string}) {
  const fc = (v:number) => g.unit==='R$'?`R$ ${v.toLocaleString('pt-BR')}`:g.unit==='%'?`${v}%`:v.toLocaleString('pt-BR');
  return g.unit==='%'||g.unit==='R$' ? `${fc(g.current)} (meta ${fc(g.target)})` : `${fc(g.current)} de ${fc(g.target)}`;
}
function updArr<T>(arr: T[], i: number, patch: Partial<T>): T[] { return arr.map((x,idx)=>idx===i?{...x,...patch}:x); }

type LForm = {
  name:string; period:string; status:string; sheet_url:string; current_phase:number;
  phases:{name:string;start:string;end:string}[];
  goals:{label:string;current:string;target:string;unit:string}[];
  launch_links:{label:string;url:string}[];
  ideas:{title:string;description:string}[];
  launch_optimizations:{date:string;action:string;result:string}[];
  learnings:string; prev_name:string; prev_kpis:{label:string;value:string}[];
};
const emptyLForm: LForm = { name:'',period:'',status:'planejamento',sheet_url:'',current_phase:0,phases:[],goals:[],launch_links:[],ideas:[],launch_optimizations:[],learnings:'',prev_name:'',prev_kpis:[] };

function LaunchesSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [items, setItems]       = useState<Launch[]>([]);
  const [loading, setLoad]      = useState(true);
  const [selected, setSelected] = useState('');
  const [showForm, setShow]     = useState(false);
  const [editing, setEdit]      = useState<Launch|null>(null);
  const [form, setForm]         = useState<LForm>(emptyLForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','launches',slug);
    const arr: Launch[] = d.launches ?? [];
    setItems(arr);
    if (arr.length > 0 && !selected) {
      const active = arr.find(l => l.status==='em_andamento');
      setSelected((active ?? arr[0]).id);
    }
    setLoad(false);
  }, [slug, selected]);

  useEffect(()=>{ load(); },[load]);

  const cur = items.find(l => l.id === selected);

  function openNew() { setForm(emptyLForm); setEdit(null); setShow(true); }
  function openEdit(l: Launch) {
    setForm({
      name:l.name, period:l.period??'', status:l.status, sheet_url:l.sheet_url??'', current_phase:l.current_phase??0,
      phases:(l.phases??[]).map(p=>({name:p.name,start:p.start,end:p.end})),
      goals:(l.goals??[]).map(g=>({label:g.label,current:String(g.current),target:String(g.target),unit:g.unit})),
      launch_links:(l.launch_links??[]).map(k=>({label:k.label,url:k.url})),
      ideas:(l.ideas??[]).map(d=>({title:d.title,description:d.description})),
      launch_optimizations:(l.launch_optimizations??[]).map(o=>({date:o.date,action:o.action,result:o.result})),
      learnings:l.learnings??'', prev_name:l.previous_data?.name??'',
      prev_kpis:l.previous_data?.kpis?.map(k=>({label:k.label,value:k.value}))??[],
    });
    setEdit(l); setShow(true);
  }
  function cancel() { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.name) return; setSaving(true);
    const body: Record<string,unknown> = {
      name:form.name, period:form.period||null, status:form.status, sheet_url:form.sheet_url||null, current_phase:form.current_phase,
      phases:form.phases, goals:form.goals.map(g=>({...g,current:Number(g.current),target:Number(g.target)})),
      launch_links:form.launch_links, ideas:form.ideas, launch_optimizations:form.launch_optimizations,
      learnings:form.learnings||null, previous_data:form.prev_name?{name:form.prev_name,kpis:form.prev_kpis}:null,
    };
    if (editing) body.id = editing.id;
    await apiFetch(editing?'PUT':'POST','launches',slug,body);
    setSaving(false); cancel(); await load();
  }

  async function del(l: Launch) {
    if (!confirm(`Excluir "${l.name}"?`)) return;
    await apiFetch('DELETE','launches',slug,undefined,{id:l.id}); setSelected(''); await load();
  }

  if (loading) return <p className="muted small">Carregando...</p>;

  /* ── Admin Form ── */
  if (showForm) return (
    <>
      <div className="page-head"><div><div className="period">Lançamentos</div><h1>{editing?'Editar lançamento':'Novo lançamento'}</h1></div></div>
      <InlineForm onSubmit={save}>
        <FullField label="Nome *">
          <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="Ex.: Imersão Respira L3"/>
        </FullField>
        <Field label="Período">
          <input className="input" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} placeholder="L3, setembro 2026"/>
        </Field>
        <Field label="Status">
          <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            <option value="planejamento">Planejamento</option><option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option><option value="pausado">Pausado</option>
          </select>
        </Field>
        <FullField label="URL da planilha (Google Sheets)">
          <input className="input" value={form.sheet_url} onChange={e=>setForm(f=>({...f,sheet_url:e.target.value}))} placeholder="https://docs.google.com/spreadsheets/d/..."/>
        </FullField>

        {/* Fases */}
        <div className="full" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <label className="small" style={{fontWeight:600}}>Fases do lançamento</label>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,phases:[...f.phases,{name:'',start:'',end:''}]}))}>+ Fase</button>
          </div>
          {form.phases.map((p,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" style={{flex:2}} placeholder="Nome" value={p.name} onChange={e=>setForm(f=>({...f,phases:updArr(f.phases,i,{name:e.target.value})}))}/>
              <input className="input" type="date" style={{flex:1}} value={p.start} onChange={e=>setForm(f=>({...f,phases:updArr(f.phases,i,{start:e.target.value})}))}/>
              <input className="input" type="date" style={{flex:1}} value={p.end} onChange={e=>setForm(f=>({...f,phases:updArr(f.phases,i,{end:e.target.value})}))}/>
              <label className="small muted" style={{display:'flex',gap:4,alignItems:'center',whiteSpace:'nowrap'}}><input type="radio" name="cur_phase" checked={form.current_phase===i} onChange={()=>setForm(f=>({...f,current_phase:i}))}/>Atual</label>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,phases:f.phases.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        {/* Metas */}
        <div className="full" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <label className="small" style={{fontWeight:600}}>Metas da captação</label>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,goals:[...f.goals,{label:'',current:'',target:'',unit:'un'}]}))}>+ Meta</button>
          </div>
          {form.goals.map((g,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" style={{flex:2}} placeholder="Label" value={g.label} onChange={e=>setForm(f=>({...f,goals:updArr(f.goals,i,{label:e.target.value})}))}/>
              <input className="input" type="number" style={{flex:1}} placeholder="Atual" value={g.current} onChange={e=>setForm(f=>({...f,goals:updArr(f.goals,i,{current:e.target.value})}))}/>
              <input className="input" type="number" style={{flex:1}} placeholder="Meta" value={g.target} onChange={e=>setForm(f=>({...f,goals:updArr(f.goals,i,{target:e.target.value})}))}/>
              <select className="input" style={{width:80,flex:'none'}} value={g.unit} onChange={e=>setForm(f=>({...f,goals:updArr(f.goals,i,{unit:e.target.value})}))}>
                <option value="un">Nº</option><option value="R$">R$</option><option value="%">%</option>
              </select>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,goals:f.goals.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        {/* Otimizações */}
        <div className="full" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <label className="small" style={{fontWeight:600}}>Otimizações do lançamento</label>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,launch_optimizations:[...f.launch_optimizations,{date:new Date().toISOString().slice(0,10),action:'',result:'obs'}]}))}>+ Otimização</button>
          </div>
          {form.launch_optimizations.map((o,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" type="date" style={{flex:1}} value={o.date} onChange={e=>setForm(f=>({...f,launch_optimizations:updArr(f.launch_optimizations,i,{date:e.target.value})}))}/>
              <input className="input" style={{flex:3}} placeholder="Ação realizada" value={o.action} onChange={e=>setForm(f=>({...f,launch_optimizations:updArr(f.launch_optimizations,i,{action:e.target.value})}))}/>
              <select className="input" style={{width:120,flex:'none'}} value={o.result} onChange={e=>setForm(f=>({...f,launch_optimizations:updArr(f.launch_optimizations,i,{result:e.target.value})}))}>
                <option value="ok">Funcionou</option><option value="bad">Não funcionou</option><option value="obs">Em observação</option>
              </select>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,launch_optimizations:f.launch_optimizations.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        {/* Ideias */}
        <div className="full" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <label className="small" style={{fontWeight:600}}>Ideias em discussão</label>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,ideas:[...f.ideas,{title:'',description:''}]}))}>+ Ideia</button>
          </div>
          {form.ideas.map((d,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" style={{flex:1}} placeholder="Título" value={d.title} onChange={e=>setForm(f=>({...f,ideas:updArr(f.ideas,i,{title:e.target.value})}))}/>
              <input className="input" style={{flex:2}} placeholder="Descrição" value={d.description} onChange={e=>setForm(f=>({...f,ideas:updArr(f.ideas,i,{description:e.target.value})}))}/>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,ideas:f.ideas.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        {/* Links do lançamento */}
        <div className="full" style={{marginTop:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
            <label className="small" style={{fontWeight:600}}>Links do lançamento</label>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,launch_links:[...f.launch_links,{label:'',url:''}]}))}>+ Link</button>
          </div>
          {form.launch_links.map((k,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" style={{flex:1}} placeholder="Label" value={k.label} onChange={e=>setForm(f=>({...f,launch_links:updArr(f.launch_links,i,{label:e.target.value})}))}/>
              <input className="input" style={{flex:2}} placeholder="URL" value={k.url} onChange={e=>setForm(f=>({...f,launch_links:updArr(f.launch_links,i,{url:e.target.value})}))}/>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,launch_links:f.launch_links.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        {/* Aprendizados */}
        <FullField label="Aprendizados">
          <textarea className="input" value={form.learnings} onChange={e=>setForm(f=>({...f,learnings:e.target.value}))} rows={3} placeholder="Aprendizados do lançamento..."/>
        </FullField>

        {/* Lançamento anterior */}
        <div className="full" style={{marginTop:16}}>
          <label className="small" style={{fontWeight:600}}>Lançamento anterior</label>
          <div style={{display:'flex',gap:6,marginTop:8,marginBottom:6}}>
            <input className="input" style={{flex:1}} placeholder="Nome (ex: L2, maio de 2026)" value={form.prev_name} onChange={e=>setForm(f=>({...f,prev_name:e.target.value}))}/>
            <button type="button" className="link-btn" onClick={()=>setForm(f=>({...f,prev_kpis:[...f.prev_kpis,{label:'',value:''}]}))}>+ KPI</button>
          </div>
          {form.prev_kpis.map((k,i)=>(
            <div key={i} style={{display:'flex',gap:6,marginBottom:6,alignItems:'center'}}>
              <input className="input" style={{flex:1}} placeholder="Label (ex: Faturamento)" value={k.label} onChange={e=>setForm(f=>({...f,prev_kpis:updArr(f.prev_kpis,i,{label:e.target.value})}))}/>
              <input className="input" style={{flex:1}} placeholder="Valor (ex: R$ 212 mil)" value={k.value} onChange={e=>setForm(f=>({...f,prev_kpis:updArr(f.prev_kpis,i,{value:e.target.value})}))}/>
              <button type="button" className="link-btn" style={{color:'var(--bad)'}} onClick={()=>setForm(f=>({...f,prev_kpis:f.prev_kpis.filter((_,j)=>j!==i)}))}>×</button>
            </div>
          ))}
        </div>

        <div className="full" style={{display:'flex',gap:8,marginTop:16}}>
          <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
          <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
        </div>
      </InlineForm>
    </>
  );

  /* ── Empty state ── */
  if (!cur) return (
    <>
      <div className="page-head"><div><div className="period">Lançamentos</div><h1>Lançamentos</h1></div>
        {isAdmin && <button className="btn btn-sm" onClick={openNew}>+ Novo lançamento</button>}
      </div>
      <EmptyState msg="Nenhum lançamento cadastrado ainda." action={isAdmin?<button className="btn btn-sm" onClick={openNew}>+ Novo lançamento</button>:undefined}/>
    </>
  );

  /* ── Dashboard view ── */
  const phases = cur.phases ?? [];
  const goals  = cur.goals ?? [];
  const links  = cur.launch_links ?? [];
  const ideas  = cur.ideas ?? [];
  const opts   = cur.launch_optimizations ?? [];
  const prev   = cur.previous_data;
  const cp     = cur.current_phase ?? 0;

  return (
    <>
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="period">Lançamento atual</div>
          <h1>{cur.name}</h1>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {items.length > 1 && (
            <select className="input" value={selected} onChange={e=>setSelected(e.target.value)} style={{width:'auto'}}>
              {items.map(l=><option key={l.id} value={l.id}>{l.name}{l.period?`, ${l.period}`:''}</option>)}
            </select>
          )}
          {isAdmin && <>
            <button className="btn-ghost btn-sm" onClick={()=>openEdit(cur)}>Editar</button>
            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(cur)}>Excluir</button>
            <button className="btn btn-sm" onClick={openNew}>+ Novo</button>
          </>}
        </div>
      </div>

      {/* Phases */}
      {phases.length > 0 && (
        <div className="phases" style={{marginBottom:28}}>
          {phases.map((p,i)=>(
            <div key={i} className={`phase${i===cp?' now':i<cp?' done':''}`}>
              <b>{p.name}</b>
              <span className="muted">{fmtRange(p.start,p.end)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Goals / Metas */}
      {goals.length > 0 && (
        <section>
          <h2>Metas da captação</h2>
          <div className="grid g2" style={{marginTop:12}}>
            {goals.map((g,i)=>(
              <div key={i} className="panel goal">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                  <h3>{g.label}</h3>
                  <span className="mono small">{fmtGoal(g)}</span>
                </div>
                <div className="bar"><i style={{width:`${Math.min(100,g.target?g.current/g.target*100:0)}%`}}/></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Otimizações + Ideias — duas colunas */}
      {(opts.length > 0 || ideas.length > 0) && (
        <div className="grid g2" style={{marginTop:28,alignItems:'start'}}>
          {opts.length > 0 ? (
            <section style={{marginTop:0}}>
              <h2>Otimizações do lançamento</h2>
              <div className="rows" style={{marginTop:12}}>
                {opts.map((o,i)=>(
                  <div key={i} className="row">
                    <div className="row-top">
                      <span className="small muted mono">{fmtDate(o.date)}</span>
                      <Tag v={resTag(o.result)}>{resLbl(o.result)}</Tag>
                    </div>
                    <p>{o.action}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : <div/>}
          {ideas.length > 0 ? (
            <section style={{marginTop:0}}>
              <h2>Ideias em discussão</h2>
              <div className="rows" style={{marginTop:12}}>
                {ideas.map((d,i)=>(
                  <div key={i} className="row">
                    <h3>{d.title}</h3>
                    {d.description && <p className="small muted">{d.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          ) : <div/>}
        </div>
      )}

      {/* Links do lançamento */}
      {links.length > 0 && (
        <section>
          <h2>Links do lançamento</h2>
          <div className="rows" style={{marginTop:12}}>
            {links.map((k,i)=>(
              <div key={i} className="lib-item">
                <div>
                  <h3>{k.label}</h3>
                  <span className="u">{k.url}</span>
                </div>
                <button className="btn-ghost btn-sm" onClick={()=>{navigator.clipboard.writeText(k.url)}}>Copiar</button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lançamento anterior */}
      {prev && (
        <section>
          <h2>Lançamento anterior: {prev.name}</h2>
          {prev.kpis?.length > 0 && (
            <div className="kpis" style={{marginTop:12}}>
              {prev.kpis.map((k,i)=>(
                <div key={i} className="kpi">
                  <div className="l">{k.label}</div>
                  <div className="v">{k.value}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Aprendizados */}
      {cur.learnings && (
        <section>
          <div className="panel" style={{borderLeft:'3px solid var(--accent)'}}>
            <h3>Aprendizados que levamos para o próximo</h3>
            <p className="small muted" style={{marginTop:8,whiteSpace:'pre-wrap'}}>{cur.learnings}</p>
          </div>
        </section>
      )}

      {/* Sheet URL (admin only) */}
      {isAdmin && cur.sheet_url && (
        <section>
          <p className="small muted">Planilha conectada: <a href={cur.sheet_url} target="_blank" rel="noopener noreferrer">{cur.sheet_url.length>60?cur.sheet_url.slice(0,60)+'…':cur.sheet_url}</a></p>
        </section>
      )}
    </>
  );
}

// ─── Section: Links ───────────────────────────────────────────────────────────
function LinksSection({ slug, isAdmin }: { slug: string; isAdmin: boolean }) {
  const [links, setLinks]   = useState<Link[]>([]);
  const [loading, setLoad]  = useState(true);
  const [showForm, setShow] = useState(false);
  const [editing, setEdit]  = useState<Link|null>(null);
  const [form, setForm]     = useState({ group_name:'', label:'', url:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoad(true);
    const d = await apiFetch('GET','links',slug);
    setLinks(d.links ?? []); setLoad(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  function openNew() { setForm({group_name:'',label:'',url:''}); setEdit(null); setShow(true); }
  function openEdit(l: Link) { setForm({group_name:l.group_name,label:l.label,url:l.url}); setEdit(l); setShow(true); }
  function cancel() { setShow(false); setEdit(null); }

  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form.group_name||!form.label||!form.url) return;
    setSaving(true);
    if (editing) { await apiFetch('PUT','links',slug,{id:editing.id,...form}); }
    else { await apiFetch('POST','links',slug,form); }
    setSaving(false); cancel(); await load();
  }

  async function del(l: Link) {
    if (!confirm(`Excluir "${l.label}"?`)) return;
    await apiFetch('DELETE','links',slug,{id:l.id}); await load();
  }

  const groups: Record<string,Link[]> = {};
  links.forEach(l=>{ (groups[l.group_name]=groups[l.group_name]||[]).push(l); });

  return (
    <>
      <div className="page-head">
        <div><div className="period">Acessos e recursos importantes</div><h1>Links e arquivos</h1></div>
        {isAdmin && !showForm && <button className="btn btn-sm" onClick={openNew}>+ Novo link</button>}
      </div>

      {showForm && (
        <InlineForm onSubmit={save}>
          <FullField label="Grupo *">
            <input className="input" value={form.group_name} onChange={e=>setForm(f=>({...f,group_name:e.target.value}))} required placeholder="Ex.: Páginas e checkout"/>
          </FullField>
          <FullField label="Nome do link *">
            <input className="input" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} required placeholder="Ex.: Página de vendas"/>
          </FullField>
          <FullField label="URL *">
            <input className="input" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} required placeholder="https://..."/>
          </FullField>
          <div className="full" style={{ display:'flex',gap:8 }}>
            <button className="btn btn-sm" type="submit">{saving?'Salvando...':'Salvar'}</button>
            <button className="btn-ghost btn-sm" type="button" onClick={cancel}>Cancelar</button>
          </div>
        </InlineForm>
      )}

      {loading ? <p className="muted small">Carregando...</p>
        : links.length===0
          ? <EmptyState msg="Nenhum link cadastrado ainda." action={isAdmin&&!showForm?<button className="btn btn-sm" onClick={openNew}>+ Novo link</button>:undefined}/>
          : (
            <div className="grid g2">
              {Object.entries(groups).map(([gName,items])=>(
                <div key={gName}>
                  <h2 style={{ marginBottom:16 }}>{gName}</h2>
                  <div className="rows">
                    {items.map(l=>(
                      <div key={l.id} className="lib-item">
                        <div style={{ minWidth:0 }}>
                          <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label}</a>
                          <div className="u">{l.url}</div>
                        </div>
                        <div style={{ display:'flex',gap:4,flexShrink:0 }}>
                          {isAdmin && <>
                            <button className="btn-ghost btn-sm" onClick={()=>openEdit(l)}>Editar</button>
                            <button className="btn-ghost btn-sm" style={{color:'var(--bad)'}} onClick={()=>del(l)}>✕</button>
                          </>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </>
  );
}

// ─── Nav type ─────────────────────────────────────────────────────────────────
type Tab = 'overview'|'mensal'|'semanal'|'diarios'|'otimizacoes'|'tarefas'|'solicitacoes'|'conteudo'|'lancamentos'|'links';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PortalClient({
  slug, clientName, isLoggedIn: initLoggedIn, isAdmin: initAdmin,
}: {
  slug: string; clientName: string; isLoggedIn: boolean; isAdmin: boolean;
}) {
  const [loggedIn, setLoggedIn] = useState(initLoggedIn);
  const [isAdmin, setIsAdmin]   = useState(initAdmin);
  const [tab, setTab]           = useState<Tab>('overview');

  // Confirm role from server (fixes cases where state was set before cookie was readable)
  useEffect(() => {
    if (!loggedIn) return;
    apiFetch('GET','me',slug).then(d => {
      if (d.role) setIsAdmin(d.role === 'admin');
    }).catch(()=>{});
  }, [loggedIn, slug]);

  async function logout() {
    await fetch(`/api/portal/logout?slug=${encodeURIComponent(slug)}`, { method:'POST', credentials:'include' });
    setLoggedIn(false); setIsAdmin(false);
  }

  if (!loggedIn) {
    return <LoginScreen slug={slug} onLogin={role => { setLoggedIn(true); setIsAdmin(role==='admin'); }}/>;
  }

  type NavEntry = { id: Tab; label: string } | { group: string };

  const nav: NavEntry[] = [
    { id:'overview',     label:'Visão geral' },
    { group:'Relatórios' },
    { id:'mensal',       label:'Relatório mensal' },
    { id:'semanal',      label:'Relatório semanal' },
    { id:'diarios',      label:'Relatórios diários' },
    { group:'Na sua conta' },
    { id:'otimizacoes',  label:'Diário de otimizações' },
    { id:'tarefas',      label:'Tarefas' },
    { id:'solicitacoes', label:'Solicitações' },
    { id:'conteudo',     label:'Conteúdo' },
    { id:'lancamentos',  label:'Lançamentos' },
    { id:'links',        label:'Links e arquivos' },
  ];

  return (
    <div className="app">
      <aside className="side">
        <div className="client-id">
          <div className="name">{clientName}</div>
          <div className="sub">Portal do cliente</div>
        </div>

        <nav className="nav" aria-label="Seções da central">
          {nav.map((item,i) => {
            if ('group' in item) return <div key={i} className="nav-group">{item.group}</div>;
            const active = tab === item.id;
            return (
              <button key={item.id} type="button"
                aria-current={active ? 'page' : undefined}
                onClick={()=>setTab(item.id)}>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="side-foot">
          <div className="who">
            <div className="avatar">AP</div>
            <div>
              Ana Paula Romano<br/>
              <span className="small muted">APR Digital{isAdmin?' · Admin':''}</span>
            </div>
          </div>
          <button className="btn-ghost btn-sm" type="button" onClick={logout}>Sair</button>
        </div>
      </aside>

      <main>
        {tab==='overview'     && <OverviewSection slug={slug}/>}
        {tab==='mensal'       && <ReportsSection slug={slug} isAdmin={isAdmin} kind="mensal"  title="Relatório mensal"   period="Relatório mensal de performance"/>}
        {tab==='semanal'      && <ReportsSection slug={slug} isAdmin={isAdmin} kind="semanal" title="Relatório semanal"  period="Relatório semanal de performance"/>}
        {tab==='diarios'      && <ReportsSection slug={slug} isAdmin={isAdmin} kind="diario"  title="Relatórios diários" period="Atualizações do dia a dia"/>}
        {tab==='otimizacoes'  && <OptimizationsSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='tarefas'      && <TasksSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='solicitacoes' && <RequestsSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='conteudo'     && <ContentSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='lancamentos'  && <LaunchesSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='links'        && <LinksSection slug={slug} isAdmin={isAdmin}/>}
      </main>
    </div>
  );
}
