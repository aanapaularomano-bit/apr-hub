'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  bg: '#F2F4F1', card: '#FFFFFF', secondary: '#EBEFE9', border: '#D7DDD6',
  text: '#121714', soft: '#5C6861', accent: '#3F6B00', accentBg: '#EBF2E0',
  ok: '#1E7F47', okBg: '#E4F5EC', error: '#B93B28', errorBg: '#FBEAE7',
};
const fn  = "'Space Grotesk', system-ui, sans-serif";
const fnT = "'Fraunces', Georgia, serif";
const fnM = "'JetBrains Mono', 'Fira Mono', monospace";

type Report = { id: string; kind: string; ref_date: string; title: string; content: string | null };
type Task   = { id: string; title: string; owner: string; status: string; note: string | null; due_date: string | null };
type Link   = { id: string; group_name: string; label: string; url: string };
type Launch = { id: string; name: string; period: string | null; status: string; metrics: string | null; content: string | null };

const KIND_LABEL: Record<string,string> = { diario:'Diário', semanal:'Semanal', mensal:'Mensal' };
const KIND_CLR: Record<string,{bg:string;text:string}> = {
  diario:  { bg:'#EEF2FF', text:'#3730A3' },
  semanal: { bg:C.accentBg, text:C.accent },
  mensal:  { bg:C.okBg, text:C.ok },
};
const TS_LBL: Record<string,string> = { a_fazer:'A fazer', fazendo:'Fazendo', feito:'Feito', nao_feito:'Não feito' };
const TS_CLR: Record<string,{bg:string;text:string}> = {
  a_fazer:   { bg:C.secondary, text:C.soft },
  fazendo:   { bg:'#FEF3C7',   text:'#92400E' },
  feito:     { bg:C.okBg,      text:C.ok },
  nao_feito: { bg:C.errorBg,   text:C.error },
};
const TS_CYCLE: Record<string,string> = { a_fazer:'fazendo', fazendo:'feito', feito:'nao_feito', nao_feito:'a_fazer' };
const TS_ORDER = ['a_fazer','fazendo','feito','nao_feito'];
const OW_LBL: Record<string,string> = { agencia:'Agência', cliente:'Cliente' };
const LS_LBL: Record<string,string> = { planejamento:'Planejamento', em_andamento:'Em andamento', concluido:'Concluído', pausado:'Pausado' };
const LS_CLR: Record<string,{bg:string;text:string}> = {
  planejamento: { bg:'#EEF2FF', text:'#3730A3' },
  em_andamento: { bg:'#FEF3C7', text:'#92400E' },
  concluido:    { bg:C.okBg,    text:C.ok },
  pausado:      { bg:C.secondary,text:C.soft },
};
const LINK_GROUPS = ['Páginas e checkout','Criativos','Swipe file e referências','Pastas e arquivos','Dashboards','Acessos'];

function fmtDate(iso: string | null) {
  if (!iso) return '';
  const [y,m,d] = iso.slice(0,10).split('-');
  return `${d}/${m}/${y}`;
}

async function apiFetch(method: string, resource: string, slug: string, body?: Record<string,unknown>, extra?: Record<string,string>) {
  const params = new URLSearchParams({ slug, ...extra });
  if (method === 'DELETE' && body?.id) params.set('id', String(body.id));
  const res = await fetch(`/api/portal/${resource}?${params}`, {
    method,
    headers: body && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {},
    body: body && method !== 'DELETE' ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.error||'Erro'); }
  return res.json();
}

function renderInline(text: string): React.ReactNode {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((p,i) => {
    if (p.startsWith('**')&&p.endsWith('**')) return <strong key={i}>{p.slice(2,-2)}</strong>;
    if (p.startsWith('*')&&p.endsWith('*'))   return <em key={i}>{p.slice(1,-1)}</em>;
    return p;
  })}</>;
}

function Markdown({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('## ')) {
      nodes.push(<h3 key={i} style={{ fontSize:14, fontWeight:700, margin:'14px 0 5px', color:C.text }}>{line.slice(3)}</h3>);
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={i} style={{ fontFamily:fnT, fontSize:17, fontWeight:600, margin:'16px 0 6px', color:C.text }}>{line.slice(2)}</h2>);
    } else if (line.startsWith('- ')||line.startsWith('* ')) {
      const items: React.ReactNode[] = [];
      while (i<lines.length&&(lines[i].startsWith('- ')||lines[i].startsWith('* '))) {
        items.push(<li key={i} style={{ marginBottom:3 }}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul${i}`} style={{ margin:'4px 0 10px', paddingLeft:20 }}>{items}</ul>);
      continue;
    } else if (line.trim()) {
      nodes.push(<p key={i} style={{ margin:'0 0 8px', lineHeight:1.65 }}>{renderInline(line)}</p>);
    }
    i++;
  }
  return <div style={{ fontSize:14, color:C.text }}>{nodes}</div>;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

function Badge({ label, color }: { label:string; color:{bg:string;text:string} }) {
  return <span style={{ display:'inline-block', padding:'3px 12px', borderRadius:100, background:color.bg, color:color.text, fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>{label}</span>;
}

const iS: React.CSSProperties = { width:'100%', boxSizing:'border-box', padding:'9px 12px', borderRadius:8, border:`1px solid ${C.border}`, fontFamily:fn, fontSize:14, color:C.text, background:C.bg };
const tS: React.CSSProperties = { ...iS, resize:'vertical', minHeight:130, lineHeight:1.6 };

function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, color:C.soft, marginBottom:5, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function Btn({ children, onClick, type='button', variant='primary', small, disabled }: {
  children:React.ReactNode; onClick?:()=>void; type?:'button'|'submit';
  variant?:'primary'|'ghost'|'danger'; small?:boolean; disabled?:boolean;
}) {
  const v: Record<string,React.CSSProperties> = {
    primary: { background:C.accent, color:'#fff', border:'none' },
    ghost:   { background:'transparent', color:C.soft, border:`1px solid ${C.border}` },
    danger:  { background:'transparent', color:C.error, border:`1px solid ${C.errorBg}` },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...v[variant], fontFamily:fn, fontSize:small?12:14, fontWeight:500, padding:small?'4px 10px':'8px 18px', borderRadius:8, cursor:disabled?'default':'pointer', opacity:disabled?0.6:1, display:'inline-flex', alignItems:'center', gap:4 }}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, onSubmit, saving, children }: {
  title:string; onClose:()=>void; onSubmit:(e:React.FormEvent)=>void; saving:boolean; children:React.ReactNode;
}) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.22)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <form onSubmit={onSubmit} style={{ background:C.card, borderRadius:16, padding:32, width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,0.12)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
          <h2 style={{ fontFamily:fnT, fontSize:22, fontWeight:600, color:C.text, margin:0 }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:C.soft, lineHeight:1, padding:0 }}>×</button>
        </div>
        {children}
        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:24 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn type="submit" disabled={saving}>{saving?'Salvando...':'Salvar'}</Btn>
        </div>
      </form>
    </div>
  );
}

function EmptyState({ message, action }: { message:string; action?:React.ReactNode }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'40px 24px', textAlign:'center' }}>
      <p style={{ color:C.soft, fontSize:14, margin:action?'0 0 16px':0, lineHeight:1.5 }}>{message}</p>
      {action}
    </div>
  );
}

function KpiCard({ label, value }: { label:string; value:number|string }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'20px 22px', flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, color:C.soft, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</div>
      <div style={{ fontFamily:fnM, fontSize:30, fontWeight:600, color:C.text, lineHeight:1 }}>{value}</div>
    </div>
  );
}

function PageHeader({ context, title, action }: { context:string; title:string; action?:React.ReactNode }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:36, gap:16 }}>
      <div>
        <div style={{ fontSize:11, color:C.soft, fontWeight:600, marginBottom:7, textTransform:'uppercase', letterSpacing:'0.08em' }}>{context}</div>
        <h1 style={{ fontFamily:fnT, fontSize:32, fontWeight:600, color:C.text, margin:0, lineHeight:1.15 }}>{title}</h1>
      </div>
      {action && <div style={{ flexShrink:0 }}>{action}</div>}
    </div>
  );
}

function NavItem({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 14px', borderRadius:8, border:'none', cursor:'pointer',
        fontFamily:fn, fontSize:14, fontWeight:active?600:400,
        color:active?C.accent:hover?C.text:C.soft,
        background:active?C.accentBg:hover?C.secondary:'transparent',
        marginBottom:2 }}>
      {label}
    </button>
  );
}

function Sidebar({ clientName, tab, setTab, isAdmin, onLogout }: {
  clientName:string; tab:string; setTab:(t:string)=>void; isAdmin:boolean; onLogout:()=>void;
}) {
  const TABS = [
    { id:'relatorios',  label:'Relatórios' },
    { id:'tarefas',     label:'Tarefas' },
    { id:'links',       label:'Links' },
    { id:'lancamentos', label:'Lançamentos' },
  ];
  return (
    <aside style={{ width:220, background:C.card, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', padding:'32px 16px 24px', height:'100vh', boxSizing:'border-box' }}>
      <div style={{ marginBottom:36, paddingLeft:14 }}>
        <div style={{ fontSize:10, color:C.soft, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:7 }}>Portal do cliente</div>
        <div style={{ fontFamily:fnT, fontSize:19, fontWeight:600, color:C.text, lineHeight:1.3 }}>{clientName}</div>
        {isAdmin && <span style={{ display:'inline-block', marginTop:8, fontSize:10, fontWeight:700, color:C.accent, background:C.accentBg, padding:'2px 9px', borderRadius:100, letterSpacing:'0.06em', textTransform:'uppercase' }}>Admin</span>}
      </div>
      <nav style={{ flex:1 }}>
        {TABS.map(t => <NavItem key={t.id} label={t.label} active={tab===t.id} onClick={()=>setTab(t.id)} />)}
      </nav>
      <button onClick={onLogout} style={{ background:'none', border:'none', fontFamily:fn, fontSize:13, color:C.soft, cursor:'pointer', textAlign:'left', padding:'8px 14px', borderRadius:8, width:'100%', display:'block' }}>
        Sair
      </button>
    </aside>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginScreen({ slug, clientName }: { slug:string; clientName:string }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setErr(''); setLoading(true);
    try {
      const res = await fetch('/api/portal/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ slug, password:pw }) });
      if (res.ok) { router.refresh(); }
      else { const d = await res.json(); setErr(d.error||'Senha incorreta'); }
    } catch { setErr('Erro ao conectar'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:fn, padding:24 }}>
      <div style={{ background:C.card, borderRadius:18, padding:'48px 40px', width:'100%', maxWidth:400, border:`1px solid ${C.border}` }}>
        <div style={{ fontSize:10, color:C.soft, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>Portal do cliente</div>
        <h1 style={{ fontFamily:fnT, fontSize:34, fontWeight:600, color:C.text, margin:'0 0 36px', lineHeight:1.2 }}>{clientName}</h1>
        <form onSubmit={handleLogin}>
          <Field label="Senha de acesso">
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} style={iS} autoFocus />
          </Field>
          {err && <p style={{ color:C.error, fontSize:13, margin:'-6px 0 14px' }}>{err}</p>}
          <button type="submit" disabled={loading}
            style={{ background:C.accent, color:'#fff', border:'none', fontFamily:fn, fontSize:14, fontWeight:600, padding:'11px 24px', borderRadius:10, cursor:loading?'default':'pointer', width:'100%', marginTop:4, opacity:loading?0.7:1 }}>
            {loading?'Entrando...':'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Tab: Relatórios ───────────────────────────────────────────────────────────

type RForm = { kind:string; ref_date:string; title:string; content:string };
const rfD: RForm = { kind:'semanal', ref_date:'', title:'', content:'' };

function TabReports({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{editing:Report|null}|null>(null);
  const [form, setForm] = useState<RForm>(rfD);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await apiFetch('GET','reports',slug,undefined,filter?{kind:filter}:{}); setReports(d.reports||[]); }
    catch {} finally { setLoading(false); }
  }, [slug,filter]);

  useEffect(()=>{ load(); },[load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal?.editing) await apiFetch('PUT','reports',slug,{id:modal.editing.id,...form});
      else await apiFetch('POST','reports',slug,form);
      setModal(null); await load();
    } catch(err:unknown){ alert(err instanceof Error?err.message:'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(r: Report) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await apiFetch('DELETE','reports',slug,{id:r.id}); await load();
  }

  const filterPill = (v:string,l:string) => (
    <button key={v} onClick={()=>setFilter(f=>f===v?'':v)}
      style={{ padding:'6px 16px', borderRadius:100, border:`1px solid ${filter===v?C.accent:C.border}`, background:filter===v?C.accentBg:C.card, color:filter===v?C.accent:C.soft, fontFamily:fn, fontSize:13, fontWeight:filter===v?600:400, cursor:'pointer' }}>
      {l}
    </button>
  );

  return (
    <div>
      <PageHeader context="Portal" title="Relatórios" action={isAdmin?<Btn onClick={()=>{setForm(rfD);setModal({editing:null})}}>+ Novo relatório</Btn>:undefined} />
      <div style={{ display:'flex', gap:8, marginBottom:28, flexWrap:'wrap' }}>
        {[['diario','Diário'],['semanal','Semanal'],['mensal','Mensal']].map(([v,l])=>filterPill(v,l))}
      </div>
      {loading ? <p style={{ color:C.soft,fontSize:14 }}>Carregando...</p>
        : reports.length===0 ? (
          <EmptyState message={`Nenhum relatório${filter?' '+KIND_LABEL[filter]?.toLowerCase():''} publicado ainda.`} action={isAdmin?<Btn onClick={()=>{setForm(rfD);setModal({editing:null})}}>+ Novo relatório</Btn>:undefined} />
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {reports.map(r=>(
              <div key={r.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:'24px 26px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <Badge label={KIND_LABEL[r.kind]||r.kind} color={KIND_CLR[r.kind]||{bg:C.secondary,text:C.soft}} />
                    <span style={{ fontFamily:fnM, fontSize:12, color:C.soft }}>{fmtDate(r.ref_date)}</span>
                  </div>
                  {isAdmin&&<div style={{ display:'flex', gap:6 }}><Btn small variant="ghost" onClick={()=>{setForm({kind:r.kind,ref_date:r.ref_date,title:r.title,content:r.content||''});setModal({editing:r})}}>Editar</Btn><Btn small variant="danger" onClick={()=>handleDelete(r)}>Excluir</Btn></div>}
                </div>
                <h2 style={{ fontFamily:fnT, fontSize:20, fontWeight:600, color:C.text, margin:'0 0 14px', lineHeight:1.3 }}>{r.title}</h2>
                {r.content&&<Markdown text={r.content}/>}
              </div>
            ))}
          </div>
        )}
      {modal&&(
        <Modal title={modal.editing?'Editar relatório':'Novo relatório'} onClose={()=>setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <Field label="Tipo"><select value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value}))} style={iS}><option value="diario">Diário</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option></select></Field>
            <Field label="Data de referência"><input type="date" value={form.ref_date} onChange={e=>setForm(f=>({...f,ref_date:e.target.value}))} style={iS} required/></Field>
          </div>
          <Field label="Título"><input type="text" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={iS} required/></Field>
          <Field label="Conteúdo — markdown: **negrito**, *itálico*, # título, - lista"><textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} style={tS}/></Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Tarefas ──────────────────────────────────────────────────────────────

type TForm = { title:string; owner:string; status:string; due_date:string; note:string };
const tfD: TForm = { title:'', owner:'agencia', status:'a_fazer', due_date:'', note:'' };

function TabTasks({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{editing:Task|null}|null>(null);
  const [form, setForm] = useState<TForm>(tfD);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try { const d=await apiFetch('GET','tasks',slug); setTasks(d.tasks||[]); }
    catch{} finally{setLoading(false);}
  },[slug]);

  useEffect(()=>{load();},[load]);

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      const p={...form,due_date:form.due_date||null,note:form.note||null};
      if(modal?.editing) await apiFetch('PUT','tasks',slug,{id:modal.editing.id,...p});
      else await apiFetch('POST','tasks',slug,p);
      setModal(null); await load();
    } catch(err:unknown){alert(err instanceof Error?err.message:'Erro');}
    finally{setSaving(false);}
  }

  async function handleDelete(t:Task) {
    if(!confirm(`Excluir "${t.title}"?`)) return;
    await apiFetch('DELETE','tasks',slug,{id:t.id}); await load();
  }

  async function cycleStatus(t:Task) {
    const next=TS_CYCLE[t.status]||'a_fazer';
    setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:next}:x));
    try{await apiFetch('PUT','tasks',slug,{id:t.id,status:next});}
    catch{setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:t.status}:x));}
  }

  const kpis = TS_ORDER.map(s=>({label:TS_LBL[s],value:tasks.filter(t=>t.status===s).length}));

  return (
    <div>
      <PageHeader context="Portal" title="Tarefas" action={isAdmin?<Btn onClick={()=>{setForm(tfD);setModal({editing:null})}}>+ Nova tarefa</Btn>:undefined}/>
      {!loading&&tasks.length>0&&(
        <div style={{ display:'flex', gap:12, marginBottom:36, flexWrap:'wrap' }}>
          {kpis.map(k=><KpiCard key={k.label} label={k.label} value={k.value}/>)}
        </div>
      )}
      {loading?<p style={{color:C.soft,fontSize:14}}>Carregando...</p>
        :tasks.length===0?(
          <EmptyState message="Nenhuma tarefa cadastrada ainda." action={isAdmin?<Btn onClick={()=>{setForm(tfD);setModal({editing:null})}}>+ Nova tarefa</Btn>:undefined}/>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:28}}>
            {TS_ORDER.map(status=>{
              const group=tasks.filter(t=>t.status===status);
              if(group.length===0) return null;
              return(
                <div key={status}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                    <Badge label={TS_LBL[status]} color={TS_CLR[status]}/>
                    <span style={{fontFamily:fnM,fontSize:12,color:C.soft}}>{group.length}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {group.map(t=>(
                      <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'15px 18px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16}}>
                        <div style={{flex:1}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:t.note||t.due_date?6:0}}>
                            <span style={{fontWeight:600,fontSize:14,color:C.text}}>{t.title}</span>
                            <span style={{fontSize:11,color:C.soft,background:C.secondary,padding:'2px 9px',borderRadius:100,fontWeight:500}}>{OW_LBL[t.owner]||t.owner}</span>
                            {t.due_date&&<span style={{fontFamily:fnM,fontSize:11,color:C.soft}}>até {fmtDate(t.due_date)}</span>}
                          </div>
                          {t.note&&<p style={{margin:0,fontSize:13,color:C.soft,lineHeight:1.55}}>{t.note}</p>}
                        </div>
                        {isAdmin&&(
                          <div style={{display:'flex',gap:6,flexShrink:0,alignItems:'center'}}>
                            <button onClick={()=>cycleStatus(t)} style={{padding:'4px 12px',borderRadius:100,border:`1px solid ${TS_CLR[t.status].bg}`,background:TS_CLR[t.status].bg,color:TS_CLR[t.status].text,fontFamily:fn,fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>{TS_LBL[t.status]}</button>
                            <Btn small variant="ghost" onClick={()=>{setForm({title:t.title,owner:t.owner,status:t.status,due_date:t.due_date||'',note:t.note||''});setModal({editing:t})}}>Editar</Btn>
                            <Btn small variant="danger" onClick={()=>handleDelete(t)}>Excluir</Btn>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      {modal&&(
        <Modal title={modal.editing?'Editar tarefa':'Nova tarefa'} onClose={()=>setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Título"><input type="text" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} style={iS} required/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Responsável"><select value={form.owner} onChange={e=>setForm(f=>({...f,owner:e.target.value}))} style={iS}><option value="agencia">Agência</option><option value="cliente">Cliente</option></select></Field>
            <Field label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={iS}>{TS_ORDER.map(s=><option key={s} value={s}>{TS_LBL[s]}</option>)}</select></Field>
          </div>
          <Field label="Prazo — opcional"><input type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} style={iS}/></Field>
          <Field label="Observação — opcional"><textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} style={{...tS,minHeight:80}}/></Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Links ────────────────────────────────────────────────────────────────

type LkForm = { group_name:string; label:string; url:string };
const lkD: LkForm = { group_name:'', label:'', url:'' };

function TabLinks({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{editing:Link|null}|null>(null);
  const [form, setForm] = useState<LkForm>(lkD);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try{const d=await apiFetch('GET','links',slug);setLinks(d.links||[]);}
    catch{}finally{setLoading(false);}
  },[slug]);

  useEffect(()=>{load();},[load]);

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try{
      if(modal?.editing) await apiFetch('PUT','links',slug,{id:modal.editing.id,...form});
      else await apiFetch('POST','links',slug,form);
      setModal(null); await load();
    }catch(err:unknown){alert(err instanceof Error?err.message:'Erro');}
    finally{setSaving(false);}
  }

  async function handleDelete(l:Link) {
    if(!confirm(`Excluir "${l.label}"?`)) return;
    await apiFetch('DELETE','links',slug,{id:l.id}); await load();
  }

  const groups=Array.from(new Set(links.map(l=>l.group_name)));
  function hostname(url:string){try{return new URL(url).hostname.replace('www.','');}catch{return url;}}

  return (
    <div>
      <PageHeader context="Portal" title="Links" action={isAdmin?<Btn onClick={()=>{setForm(lkD);setModal({editing:null})}}>+ Novo link</Btn>:undefined}/>
      {loading?<p style={{color:C.soft,fontSize:14}}>Carregando...</p>
        :links.length===0?(
          <EmptyState message="Nenhum link cadastrado ainda." action={isAdmin?<Btn onClick={()=>{setForm(lkD);setModal({editing:null})}}>+ Novo link</Btn>:undefined}/>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:32}}>
            {groups.map(group=>(
              <div key={group}>
                <div style={{fontSize:11,fontWeight:700,color:C.soft,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:10}}>{group}</div>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {links.filter(l=>l.group_name===group).map(l=>(
                    <div key={l.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
                      <div style={{flex:1,minWidth:0}}>
                        <a href={l.url} target="_blank" rel="noopener noreferrer" style={{display:'block',color:C.accent,fontWeight:600,fontSize:14,textDecoration:'none',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.label}</a>
                        <span style={{fontFamily:fnM,fontSize:11,color:C.soft}}>{hostname(l.url)}</span>
                      </div>
                      {isAdmin&&<div style={{display:'flex',gap:6,flexShrink:0}}><Btn small variant="ghost" onClick={()=>{setForm({group_name:l.group_name,label:l.label,url:l.url});setModal({editing:l})}}>Editar</Btn><Btn small variant="danger" onClick={()=>handleDelete(l)}>Excluir</Btn></div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      {modal&&(
        <Modal title={modal.editing?'Editar link':'Novo link'} onClose={()=>setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Grupo">
            <input list="lg" type="text" value={form.group_name} onChange={e=>setForm(f=>({...f,group_name:e.target.value}))} style={iS} required placeholder="ex: Dashboards"/>
            <datalist id="lg">{LINK_GROUPS.map(g=><option key={g} value={g}/>)}</datalist>
          </Field>
          <Field label="Título"><input type="text" value={form.label} onChange={e=>setForm(f=>({...f,label:e.target.value}))} style={iS} required/></Field>
          <Field label="URL"><input type="url" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} style={iS} required placeholder="https://"/></Field>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Lançamentos ──────────────────────────────────────────────────────────

type LnForm = { name:string; period:string; status:string; metrics:string; content:string };
const lnD: LnForm = { name:'', period:'', status:'planejamento', metrics:'', content:'' };

function TabLaunches({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{editing:Launch|null}|null>(null);
  const [form, setForm] = useState<LnForm>(lnD);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try{const d=await apiFetch('GET','launches',slug);setLaunches(d.launches||[]);}
    catch{}finally{setLoading(false);}
  },[slug]);

  useEffect(()=>{load();},[load]);

  async function handleSubmit(e:React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try{
      const p={...form,period:form.period||null,metrics:form.metrics||null,content:form.content||null};
      if(modal?.editing) await apiFetch('PUT','launches',slug,{id:modal.editing.id,...p});
      else await apiFetch('POST','launches',slug,p);
      setModal(null); await load();
    }catch(err:unknown){alert(err instanceof Error?err.message:'Erro');}
    finally{setSaving(false);}
  }

  async function handleDelete(l:Launch) {
    if(!confirm(`Excluir "${l.name}"?`)) return;
    await apiFetch('DELETE','launches',slug,{id:l.id}); await load();
  }

  const statusKeys=['planejamento','em_andamento','concluido','pausado'];
  const kpis=[
    {label:'Total',value:launches.length},
    ...statusKeys.map(s=>({label:LS_LBL[s],value:launches.filter(l=>l.status===s).length})).filter(k=>k.value>0),
  ];

  return (
    <div>
      <PageHeader context="Portal" title="Lançamentos" action={isAdmin?<Btn onClick={()=>{setForm(lnD);setModal({editing:null})}}>+ Novo lançamento</Btn>:undefined}/>
      {!loading&&launches.length>0&&(
        <div style={{display:'flex',gap:12,marginBottom:36,flexWrap:'wrap'}}>
          {kpis.map(k=><KpiCard key={k.label} label={k.label} value={k.value}/>)}
        </div>
      )}
      {loading?<p style={{color:C.soft,fontSize:14}}>Carregando...</p>
        :launches.length===0?(
          <EmptyState message="Nenhum lançamento cadastrado ainda." action={isAdmin?<Btn onClick={()=>{setForm(lnD);setModal({editing:null})}}>+ Novo lançamento</Btn>:undefined}/>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {launches.map(l=>(
              <div key={l.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:'26px 26px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:16,marginBottom:14}}>
                  <div>
                    <h2 style={{fontFamily:fnT,fontSize:22,fontWeight:600,color:C.text,margin:'0 0 8px',lineHeight:1.2}}>{l.name}</h2>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                      <Badge label={LS_LBL[l.status]||l.status} color={LS_CLR[l.status]||{bg:C.secondary,text:C.soft}}/>
                      {l.period&&<span style={{fontFamily:fnM,fontSize:12,color:C.soft}}>{l.period}</span>}
                    </div>
                  </div>
                  {isAdmin&&<div style={{display:'flex',gap:6,flexShrink:0}}><Btn small variant="ghost" onClick={()=>{setForm({name:l.name,period:l.period||'',status:l.status,metrics:l.metrics||'',content:l.content||''});setModal({editing:l})}}>Editar</Btn><Btn small variant="danger" onClick={()=>handleDelete(l)}>Excluir</Btn></div>}
                </div>
                {l.metrics&&(
                  <div style={{background:C.secondary,borderRadius:10,padding:'14px 16px',marginBottom:16,fontFamily:fnM,fontSize:13,color:C.text,whiteSpace:'pre-wrap',lineHeight:1.8}}>
                    {l.metrics}
                  </div>
                )}
                {l.content&&<Markdown text={l.content}/>}
              </div>
            ))}
          </div>
        )}
      {modal&&(
        <Modal title={modal.editing?'Editar lançamento':'Novo lançamento'} onClose={()=>setModal(null)} onSubmit={handleSubmit} saving={saving}>
          <Field label="Nome"><input type="text" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={iS} required/></Field>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="Período — ex: set/2026"><input type="text" value={form.period} onChange={e=>setForm(f=>({...f,period:e.target.value}))} style={iS}/></Field>
            <Field label="Status"><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} style={iS}>{statusKeys.map(s=><option key={s} value={s}>{LS_LBL[s]}</option>)}</select></Field>
          </div>
          <Field label="Números — métricas e resultados"><textarea value={form.metrics} onChange={e=>setForm(f=>({...f,metrics:e.target.value}))} style={{...tS,minHeight:90}} placeholder={'Investimento: R$ 5.000\nFaturamento: R$ 22.000\nROAS: 4,4x'}/></Field>
          <Field label="Otimizações, ideias e aprendizados — markdown"><textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} style={tS}/></Field>
        </Modal>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface PortalProps {
  portal: { clients: { name:string }|{ name:string }[] };
  isLoggedIn:boolean; isAdmin:boolean; slug:string; clientId:string;
}

export default function PortalClient({ portal, isLoggedIn, isAdmin, slug }: PortalProps) {
  const [tab, setTab] = useState('relatorios');
  const [mobile, setMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(()=>{
    const check=()=>setMobile(window.innerWidth<768);
    check();
    window.addEventListener('resize',check);
    return ()=>window.removeEventListener('resize',check);
  },[]);

  const clientName=(()=>{
    const c=portal.clients;
    if(Array.isArray(c)) return c[0]?.name||'Portal';
    return (c as {name:string})?.name||'Portal';
  })();

  if(!isLoggedIn) return <LoginScreen slug={slug} clientName={clientName}/>;

  async function logout() {
    await fetch('/api/portal/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug})});
    router.refresh();
  }

  function handleTab(t:string){ setTab(t); setSidebarOpen(false); }

  return (
    <div style={{minHeight:'100vh',background:C.bg,fontFamily:fn}}>
      {/* Mobile top bar */}
      {mobile&&(
        <div style={{position:'fixed',top:0,left:0,right:0,height:52,background:C.card,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',zIndex:100}}>
          <span style={{fontFamily:fnT,fontSize:17,fontWeight:600,color:C.text}}>{clientName}</span>
          <button onClick={()=>setSidebarOpen(v=>!v)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',gap:4,padding:4}}>
            <div style={{width:20,height:2,background:C.text,borderRadius:1}}/>
            <div style={{width:20,height:2,background:C.text,borderRadius:1}}/>
            <div style={{width:20,height:2,background:C.text,borderRadius:1}}/>
          </button>
        </div>
      )}

      {/* Mobile backdrop */}
      {mobile&&sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.18)',zIndex:149}}/>}

      <div style={{maxWidth:1120,margin:'0 auto',display:'flex',minHeight:'100vh'}}>
        {/* Sidebar wrapper */}
        <div style={mobile?{
          position:'fixed',left:sidebarOpen?0:-240,top:0,bottom:0,zIndex:150,
          transition:'left 0.22s cubic-bezier(0.4,0,0.2,1)',
          boxShadow:sidebarOpen?'4px 0 20px rgba(0,0,0,0.1)':'none',
        }:{
          flexShrink:0,position:'sticky',top:0,height:'100vh',alignSelf:'flex-start',
        }}>
          <Sidebar clientName={clientName} tab={tab} setTab={handleTab} isAdmin={isAdmin} onLogout={logout}/>
        </div>

        {/* Content */}
        <main style={{flex:1,padding:mobile?'68px 20px 40px':'40px 40px 60px',minWidth:0}}>
          {tab==='relatorios'  &&<TabReports   slug={slug} isAdmin={isAdmin}/>}
          {tab==='tarefas'     &&<TabTasks      slug={slug} isAdmin={isAdmin}/>}
          {tab==='links'       &&<TabLinks      slug={slug} isAdmin={isAdmin}/>}
          {tab==='lancamentos' &&<TabLaunches   slug={slug} isAdmin={isAdmin}/>}
        </main>
      </div>
    </div>
  );
}
