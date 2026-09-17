'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ─── Design tokens (matches prototipo-referencia.html) ───────────────────────
const C = {
  bg:       '#F2F4F1',
  surface:  '#FFFFFF',
  surface2: '#EBEFE9',
  line:     '#D7DDD6',
  text:     '#121714',
  muted:    '#6B7C74',
  accent:   '#3F6B00',
  accentBg: '#EBF2E0',
  ok:       '#1E7F47',
  okBg:     '#E4F5EC',
  warn:     '#92400E',
  warnBg:   '#FEF3C7',
  bad:      '#B93B28',
  badBg:    '#FBEAE7',
  info:     '#1e40af',
  infoBg:   '#EEF2FF',
};

const sans  = "'Space Grotesk', system-ui, sans-serif";
const serif = "'Fraunces', Georgia, serif";
const mono  = "'JetBrains Mono', 'Fira Mono', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────
type Report = { id: string; kind: string; ref_date: string; title: string; content: string | null };
type Task   = { id: string; title: string; owner: string; status: string; note: string | null; due_date: string | null };
type Link   = { id: string; group_name: string; label: string; url: string };
type Launch = { id: string; name: string; period: string | null; status: string; metrics: string | null; content: string | null };

// ─── Constants ────────────────────────────────────────────────────────────────
const KIND_LBL: Record<string,string> = { diario:'Diário', semanal:'Semanal', mensal:'Mensal' };
const TS_LBL:  Record<string,string>  = { a_fazer:'A fazer', fazendo:'Fazendo', feito:'Feito', nao_feito:'Não feito' };
const TS_CYCLE: Record<string,string> = { a_fazer:'fazendo', fazendo:'feito', feito:'nao_feito', nao_feito:'a_fazer' };
const TS_ORDER = ['a_fazer','fazendo','feito','nao_feito'];
const OW_LBL:  Record<string,string>  = { agencia:'Agência', cliente:'Cliente' };
const LS_LBL:  Record<string,string>  = { planejamento:'Planejamento', em_andamento:'Em andamento', concluido:'Concluído', pausado:'Pausado' };

// ─── Tag / pill styles ────────────────────────────────────────────────────────
type TagVariant = ''|'ok'|'bad'|'warn'|'acc'|'info';
function tagStyle(v: TagVariant): React.CSSProperties {
  const map: Record<TagVariant,[string,string]> = {
    '':    [C.surface2, C.muted],
    ok:    [C.okBg,     C.ok],
    bad:   [C.badBg,    C.bad],
    warn:  [C.warnBg,   C.warn],
    acc:   [C.accentBg, C.accent],
    info:  [C.infoBg,   C.info],
  };
  const [bg, color] = map[v];
  return { display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:99,
           fontSize:12, fontWeight:500, background:bg, color, fontFamily:sans,
           whiteSpace:'nowrap' as const };
}

function taskTag(s: string): React.ReactElement {
  const v: TagVariant = s==='feito'?'ok':s==='nao_feito'?'bad':s==='fazendo'?'warn':'';
  return <span style={tagStyle(v)}>{TS_LBL[s]??s}</span>;
}
function launchTag(s: string): React.ReactElement {
  const v: TagVariant = s==='concluido'?'ok':s==='pausado'?'bad':s==='em_andamento'?'warn':'info';
  return <span style={tagStyle(v)}>{LS_LBL[s]??s}</span>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '';
  const [y,m,d] = iso.slice(0,10).split('-');
  return `${d}/${m}/${y}`;
}

async function apiFetch(
  method: string, resource: string, slug: string,
  body?: Record<string,unknown>, extra?: Record<string,string>
) {
  const qs = new URLSearchParams({ slug, ...extra });
  const r = await fetch(`/api/portal/${resource}?${qs}`, {
    method,
    headers: body ? { 'Content-Type':'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  return r.json();
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
function Btn({ children, onClick, variant='primary', small=false, style:xStyle, type='button' }:
  { children:React.ReactNode; onClick?:()=>void; variant?:'primary'|'ghost'|'danger'; small?:boolean; style?:React.CSSProperties; type?:'button'|'submit' }) {
  const base: React.CSSProperties = {
    display:'inline-flex', alignItems:'center', gap:6, cursor:'pointer',
    borderRadius:10, fontFamily:sans, fontWeight:500, border:'none',
    padding: small ? '6px 12px' : '9px 18px',
    fontSize: small ? 13 : 14,
    transition:'opacity .15s',
  };
  const variants = {
    primary: { background:C.text, color:C.bg },
    ghost:   { background:'transparent', color:C.muted, border:`1px solid ${C.line}` },
    danger:  { background:C.badBg, color:C.bad },
  };
  return (
    <button type={type} onClick={onClick}
      style={{...base, ...variants[variant], ...xStyle}}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type='text', placeholder='', required=false, rows }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string;
    placeholder?:string; required?:boolean; rows?:number }) {
  const s: React.CSSProperties = {
    width:'100%', padding:'10px 12px', borderRadius:10, fontFamily:sans, fontSize:14,
    border:`1px solid ${C.line}`, background:C.surface, color:C.text, outline:'none',
    boxSizing:'border-box' as const,
  };
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block', fontSize:12, color:C.muted, marginBottom:4, fontFamily:sans}}>
        {label}{required && <span style={{color:C.bad}}> *</span>}
      </label>
      {rows
        ? <textarea rows={rows} value={value} onChange={e=>onChange(e.target.value)}
            placeholder={placeholder} style={{...s, resize:'vertical', lineHeight:1.5}}/>
        : <input type={type} value={value} onChange={e=>onChange(e.target.value)}
            placeholder={placeholder} style={s}/>
      }
    </div>
  );
}

function Select({ label, value, onChange, options }:
  { label:string; value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block', fontSize:12, color:C.muted, marginBottom:4, fontFamily:sans}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:'100%', padding:'10px 12px', borderRadius:10, fontFamily:sans, fontSize:14,
                border:`1px solid ${C.line}`, background:C.surface, color:C.text, outline:'none'}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// Connected list pattern from prototype
function Rows({ children }: { children: React.ReactNode }) {
  return (
    <div style={{border:`1px solid ${C.line}`, borderRadius:14, overflow:'hidden', background:C.surface}}>
      {children}
    </div>
  );
}
function Row({ children, first=false }: { children: React.ReactNode; first?: boolean }) {
  return (
    <div style={{padding:'14px 18px', borderTop: first ? 'none' : `1px solid ${C.line}`}}>
      {children}
    </div>
  );
}
function RowTop({ children }: { children: React.ReactNode }) {
  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' as const}}>
      {children}
    </div>
  );
}

// Connected KPI strip
function KpiStrip({ items }: { items: { label:string; value:string; delta?:string }[] }) {
  if (!items.length) return null;
  return (
    <div style={{
      display:'grid', gridTemplateColumns:`repeat(${items.length}, minmax(100px, 1fr))`,
      border:`1px solid ${C.line}`, borderRadius:14, overflow:'hidden',
      background:C.surface, marginBottom:20,
    }}>
      {items.map((item, i) => (
        <div key={i} style={{
          padding:'16px 18px',
          borderRight: i < items.length-1 ? `1px solid ${C.line}` : 'none',
        }}>
          <div style={{fontSize:12, color:C.muted, fontFamily:sans, marginBottom:4}}>{item.label}</div>
          <div style={{fontSize:22, fontWeight:600, fontFamily:mono, color:C.text, lineHeight:1}}>{item.value}</div>
          {item.delta && <div style={{fontSize:11, fontFamily:mono, color:C.muted, marginTop:2}}>{item.delta}</div>}
        </div>
      ))}
    </div>
  );
}

// Page header (period above title)
function PageHead({ period, title, action }:
  { period?:string; title:string; action?:React.ReactNode }) {
  return (
    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:20, gap:12, flexWrap:'wrap' as const}}>
      <div>
        {period && <div style={{fontSize:13, color:C.muted, fontFamily:sans, marginBottom:4}}>{period}</div>}
        <h1 style={{margin:0, fontFamily:serif, fontWeight:400, fontSize:'clamp(28px,4vw,40px)', color:C.text, lineHeight:1.1}}>
          {title}
        </h1>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Empty state as a card
function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div style={{
      border:`1px dashed ${C.line}`, borderRadius:14, background:C.surface,
      padding:'40px 24px', textAlign:'center' as const,
    }}>
      <p style={{margin:'0 0 12px', fontSize:14, color:C.muted, fontFamily:sans}}>{message}</p>
      {action}
    </div>
  );
}

// Modal overlay
function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div onClick={onClose} style={{position:'absolute',inset:0,background:'rgba(0,0,0,.35)'}}/>
      <div style={{position:'relative',background:C.surface,borderRadius:16,padding:28,width:'100%',maxWidth:480,
                   maxHeight:'90vh',overflowY:'auto',boxShadow:'0 8px 32px rgba(0,0,0,.15)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h2 style={{margin:0,fontFamily:serif,fontWeight:400,fontSize:22,color:C.text}}>{title}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:20,color:C.muted}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Section: Relatórios ──────────────────────────────────────────────────────
type ReportModal = { editing: Report | null };
const rfD = { kind:'mensal', ref_date:'', title:'', content:'' };

function ReportsSection({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [reports, setReports]   = useState<Report[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');
  const [modal, setModal]       = useState<ReportModal|null>(null);
  const [form, setForm]         = useState(rfD);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET','reports',slug);
    setReports(d.reports ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const visible = filter ? reports.filter(r=>r.kind===filter) : reports;

  async function save() {
    if (!form.title || !form.ref_date) return;
    setSaving(true);
    if (modal?.editing) {
      await apiFetch('PUT','reports',slug,{ id:modal.editing.id, ...form });
    } else {
      await apiFetch('POST','reports',slug, form);
    }
    setSaving(false); setModal(null); await load();
  }

  async function del(r: Report) {
    if (!confirm(`Excluir "${r.title}"?`)) return;
    await apiFetch('DELETE','reports',slug,{id:r.id}); await load();
  }

  const chips = ['diario','semanal','mensal'];

  return (
    <div>
      <PageHead period="Relatórios publicados pela agência" title="Relatórios"
        action={isAdmin ? <Btn onClick={()=>{setForm(rfD);setModal({editing:null})}}>+ Novo relatório</Btn> : undefined}/>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {chips.map(v=>(
          <button key={v} type="button" onClick={()=>setFilter(f=>f===v?'':v)}
            aria-pressed={filter===v}
            style={{
              border:`1px solid ${filter===v?C.text:C.line}`,
              borderRadius:20, padding:'5px 12px', fontSize:13,
              color: filter===v ? C.bg : C.muted,
              background: filter===v ? C.text : C.surface,
              cursor:'pointer', fontFamily:sans,
            }}>
            {KIND_LBL[v]}
          </button>
        ))}
      </div>

      {loading ? <p style={{color:C.muted,fontSize:14,fontFamily:sans}}>Carregando...</p>
        : visible.length===0 ? (
          <EmptyState message={`Nenhum relatório${filter?' '+KIND_LBL[filter]?.toLowerCase():''} publicado ainda.`}
            action={isAdmin?<Btn onClick={()=>{setForm(rfD);setModal({editing:null})}}>+ Novo relatório</Btn>:undefined}/>
        ) : (
          <Rows>
            {visible.map((r,i)=>(
              <Row key={r.id} first={i===0}>
                <RowTop>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span style={tagStyle(r.kind==='mensal'?'ok':r.kind==='semanal'?'acc':'info')}>{KIND_LBL[r.kind]}</span>
                    <span style={{fontFamily:sans,fontWeight:500,fontSize:14,color:C.text}}>{r.title}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:13,color:C.muted,fontFamily:mono}}>{fmtDate(r.ref_date)}</span>
                    {isAdmin && <>
                      <Btn small variant="ghost" onClick={()=>{setForm({kind:r.kind,ref_date:r.ref_date,title:r.title,content:r.content??''});setModal({editing:r});}}>Editar</Btn>
                      <Btn small variant="danger" onClick={()=>del(r)}>Excluir</Btn>
                    </>}
                  </div>
                </RowTop>
                {r.content && <p style={{margin:'8px 0 0',fontSize:14,color:C.muted,fontFamily:sans,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{r.content}</p>}
              </Row>
            ))}
          </Rows>
        )
      }

      {modal!==null && (
        <Modal title={modal.editing?'Editar relatório':'Novo relatório'} onClose={()=>setModal(null)}>
          <Select label="Tipo" value={form.kind} onChange={v=>setForm(f=>({...f,kind:v}))}
            options={[{value:'diario',label:'Diário'},{value:'semanal',label:'Semanal'},{value:'mensal',label:'Mensal'}]}/>
          <Input label="Data de referência" type="date" value={form.ref_date} onChange={v=>setForm(f=>({...f,ref_date:v}))} required/>
          <Input label="Título" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} required placeholder="Ex: Relatório de agosto"/>
          <Input label="Conteúdo" value={form.content} onChange={v=>setForm(f=>({...f,content:v}))} rows={5} placeholder="Resumo, observações ou link..."/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={save}>{saving?'Salvando...':'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Section: Tarefas (kanban) ────────────────────────────────────────────────
function TasksSection({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<{editing:Task|null}|null>(null);
  const [form, setForm]     = useState({ title:'', owner:'agencia', status:'a_fazer', note:'', due_date:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET','tasks',slug);
    setTasks(d.tasks ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  async function cycleStatus(t: Task) {
    await apiFetch('PUT','tasks',slug,{ id:t.id, status:TS_CYCLE[t.status]??'a_fazer' });
    await load();
  }

  async function save() {
    if (!form.title) return;
    setSaving(true);
    if (modal?.editing) {
      await apiFetch('PUT','tasks',slug,{ id:modal.editing.id, ...form, due_date:form.due_date||null });
    } else {
      await apiFetch('POST','tasks',slug,{ ...form, due_date:form.due_date||null });
    }
    setSaving(false); setModal(null); await load();
  }

  async function del(t: Task) {
    if (!confirm(`Excluir "${t.title}"?`)) return;
    await apiFetch('DELETE','tasks',slug,{id:t.id}); await load();
  }

  const byStatus = TS_ORDER.reduce<Record<string,Task[]>>((acc,s)=>{
    acc[s] = tasks.filter(t=>t.status===s);
    return acc;
  },{});

  const counts = TS_ORDER.map(s=>byStatus[s].length);

  return (
    <div>
      <PageHead period="Status das entregas e responsabilidades" title="Tarefas"
        action={isAdmin?<Btn onClick={()=>{setForm({title:'',owner:'agencia',status:'a_fazer',note:'',due_date:''});setModal({editing:null})}}>+ Nova tarefa</Btn>:undefined}/>

      {tasks.length>0 && (
        <KpiStrip items={[
          { label:'Total', value:String(tasks.length) },
          { label:'A fazer', value:String(byStatus.a_fazer.length) },
          { label:'Fazendo', value:String(byStatus.fazendo.length) },
          { label:'Feito', value:String(byStatus.feito.length) },
        ]}/>
      )}

      {loading ? <p style={{color:C.muted,fontSize:14,fontFamily:sans}}>Carregando...</p>
        : tasks.length===0 ? (
          <EmptyState message="Nenhuma tarefa ainda."
            action={isAdmin?<Btn onClick={()=>{setForm({title:'',owner:'agencia',status:'a_fazer',note:'',due_date:''});setModal({editing:null})}}>+ Nova tarefa</Btn>:undefined}/>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12}}>
            {TS_ORDER.map(s=>(
              <div key={s}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:10}}>
                  {taskTag(s)}
                  <span style={{fontSize:12,color:C.muted,fontFamily:mono}}>{counts[TS_ORDER.indexOf(s)]}</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {byStatus[s].length===0
                    ? <div style={{border:`1px dashed ${C.line}`,borderRadius:10,padding:12,textAlign:'center'}}>
                        <span style={{fontSize:12,color:C.muted,fontFamily:sans}}>Vazio</span>
                      </div>
                    : byStatus[s].map(t=>(
                        <div key={t.id} style={{background:C.surface,border:`1px solid ${C.line}`,borderRadius:10,padding:'12px 14px'}}>
                          <div style={{fontSize:13,fontWeight:500,color:C.text,fontFamily:sans,marginBottom:4,lineHeight:1.4}}>{t.title}</div>
                          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                            <span style={tagStyle('')}>{OW_LBL[t.owner]??t.owner}</span>
                            {t.due_date && <span style={{fontSize:11,color:C.muted,fontFamily:mono}}>{fmtDate(t.due_date)}</span>}
                          </div>
                          {t.note && <p style={{margin:'8px 0 0',fontSize:12,color:C.muted,fontFamily:sans,lineHeight:1.5}}>{t.note}</p>}
                          <div style={{display:'flex',gap:6,marginTop:10}}>
                            {isAdmin && (
                              <>
                                <Btn small variant="ghost" onClick={()=>cycleStatus(t)}>Avançar</Btn>
                                <Btn small variant="ghost" onClick={()=>{setForm({title:t.title,owner:t.owner,status:t.status,note:t.note??'',due_date:t.due_date??''});setModal({editing:t});}}>Editar</Btn>
                                <Btn small variant="danger" onClick={()=>del(t)}>✕</Btn>
                              </>
                            )}
                          </div>
                        </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>
        )
      }

      {modal!==null && (
        <Modal title={modal.editing?'Editar tarefa':'Nova tarefa'} onClose={()=>setModal(null)}>
          <Input label="Título" value={form.title} onChange={v=>setForm(f=>({...f,title:v}))} required placeholder="Descreva a tarefa"/>
          <Select label="Responsável" value={form.owner} onChange={v=>setForm(f=>({...f,owner:v}))}
            options={[{value:'agencia',label:'Agência'},{value:'cliente',label:'Cliente'}]}/>
          <Select label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))}
            options={TS_ORDER.map(s=>({value:s,label:TS_LBL[s]}))}/>
          <Input label="Data limite" type="date" value={form.due_date} onChange={v=>setForm(f=>({...f,due_date:v}))}/>
          <Input label="Observação" value={form.note} onChange={v=>setForm(f=>({...f,note:v}))} rows={3} placeholder="Detalhes adicionais..."/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={save}>{saving?'Salvando...':'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Section: Links ───────────────────────────────────────────────────────────
function LinksSection({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [links, setLinks]   = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<{editing:Link|null}|null>(null);
  const [form, setForm]     = useState({ group_name:'', label:'', url:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET','links',slug);
    setLinks(d.links ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  async function save() {
    if (!form.group_name||!form.label||!form.url) return;
    setSaving(true);
    if (modal?.editing) {
      await apiFetch('PUT','links',slug,{ id:modal.editing.id, ...form });
    } else {
      await apiFetch('POST','links',slug, form);
    }
    setSaving(false); setModal(null); await load();
  }

  async function del(l: Link) {
    if (!confirm(`Excluir "${l.label}"?`)) return;
    await apiFetch('DELETE','links',slug,{id:l.id}); await load();
  }

  // Group by group_name
  const groups = links.reduce<Record<string,Link[]>>((acc,l)=>{
    (acc[l.group_name]??=[]).push(l);
    return acc;
  },{});

  return (
    <div>
      <PageHead period="Acessos e recursos importantes" title="Links"
        action={isAdmin?<Btn onClick={()=>{setForm({group_name:'',label:'',url:''});setModal({editing:null})}}>+ Novo link</Btn>:undefined}/>

      {loading ? <p style={{color:C.muted,fontSize:14,fontFamily:sans}}>Carregando...</p>
        : links.length===0 ? (
          <EmptyState message="Nenhum link cadastrado ainda."
            action={isAdmin?<Btn onClick={()=>{setForm({group_name:'',label:'',url:''});setModal({editing:null})}}>+ Novo link</Btn>:undefined}/>
        ) : (
          Object.entries(groups).map(([gName, items])=>(
            <div key={gName} style={{marginBottom:24}}>
              <h2 style={{fontFamily:serif,fontWeight:400,fontSize:18,color:C.text,margin:'0 0 10px'}}>{gName}</h2>
              <Rows>
                {items.map((l,i)=>(
                  <Row key={l.id} first={i===0}>
                    <RowTop>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        style={{fontSize:14,fontWeight:500,color:C.accent,fontFamily:sans,textDecoration:'none'}}>
                        {l.label}
                        <span style={{fontSize:11,color:C.muted,marginLeft:6,fontFamily:mono}}>↗</span>
                      </a>
                      {isAdmin && (
                        <div style={{display:'flex',gap:6}}>
                          <Btn small variant="ghost" onClick={()=>{setForm({group_name:l.group_name,label:l.label,url:l.url});setModal({editing:l});}}>Editar</Btn>
                          <Btn small variant="danger" onClick={()=>del(l)}>Excluir</Btn>
                        </div>
                      )}
                    </RowTop>
                    <div style={{fontSize:12,color:C.muted,fontFamily:mono,marginTop:4,wordBreak:'break-all' as const}}>{l.url}</div>
                  </Row>
                ))}
              </Rows>
            </div>
          ))
        )
      }

      {modal!==null && (
        <Modal title={modal.editing?'Editar link':'Novo link'} onClose={()=>setModal(null)}>
          <Input label="Grupo" value={form.group_name} onChange={v=>setForm(f=>({...f,group_name:v}))} required placeholder="Ex: Páginas e checkout"/>
          <Input label="Nome do link" value={form.label} onChange={v=>setForm(f=>({...f,label:v}))} required placeholder="Ex: Página de vendas"/>
          <Input label="URL" value={form.url} onChange={v=>setForm(f=>({...f,url:v}))} required placeholder="https://..."/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={save}>{saving?'Salvando...':'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Section: Lançamentos ─────────────────────────────────────────────────────
function LaunchesSection({ slug, isAdmin }: { slug:string; isAdmin:boolean }) {
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<{editing:Launch|null}|null>(null);
  const [form, setForm]         = useState({ name:'', period:'', status:'planejamento', metrics:'', content:'' });
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await apiFetch('GET','launches',slug);
    setLaunches(d.launches ?? []);
    setLoading(false);
  }, [slug]);

  useEffect(()=>{ load(); },[load]);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    if (modal?.editing) {
      await apiFetch('PUT','launches',slug,{ id:modal.editing.id, ...form, period:form.period||null, metrics:form.metrics||null, content:form.content||null });
    } else {
      await apiFetch('POST','launches',slug,{ ...form, period:form.period||null, metrics:form.metrics||null, content:form.content||null });
    }
    setSaving(false); setModal(null); await load();
  }

  async function del(l: Launch) {
    if (!confirm(`Excluir "${l.name}"?`)) return;
    await apiFetch('DELETE','launches',slug,{id:l.id}); await load();
  }

  const counts = {
    total: launches.length,
    em_andamento: launches.filter(l=>l.status==='em_andamento').length,
    concluido: launches.filter(l=>l.status==='concluido').length,
  };

  return (
    <div>
      <PageHead period="Histórico e planejamento de lançamentos" title="Lançamentos"
        action={isAdmin?<Btn onClick={()=>{setForm({name:'',period:'',status:'planejamento',metrics:'',content:''});setModal({editing:null})}}>+ Novo lançamento</Btn>:undefined}/>

      {launches.length>0 && (
        <KpiStrip items={[
          { label:'Total', value:String(counts.total) },
          { label:'Em andamento', value:String(counts.em_andamento) },
          { label:'Concluídos', value:String(counts.concluido) },
        ]}/>
      )}

      {loading ? <p style={{color:C.muted,fontSize:14,fontFamily:sans}}>Carregando...</p>
        : launches.length===0 ? (
          <EmptyState message="Nenhum lançamento cadastrado ainda."
            action={isAdmin?<Btn onClick={()=>{setForm({name:'',period:'',status:'planejamento',metrics:'',content:''});setModal({editing:null})}}>+ Novo lançamento</Btn>:undefined}/>
        ) : (
          <Rows>
            {launches.map((l,i)=>(
              <Row key={l.id} first={i===0}>
                <RowTop>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    {launchTag(l.status)}
                    <span style={{fontFamily:sans,fontWeight:500,fontSize:14,color:C.text}}>{l.name}</span>
                    {l.period && <span style={{fontSize:12,color:C.muted,fontFamily:mono}}>{l.period}</span>}
                  </div>
                  {isAdmin && (
                    <div style={{display:'flex',gap:6}}>
                      <Btn small variant="ghost" onClick={()=>{setForm({name:l.name,period:l.period??'',status:l.status,metrics:l.metrics??'',content:l.content??''});setModal({editing:l});}}>Editar</Btn>
                      <Btn small variant="danger" onClick={()=>del(l)}>Excluir</Btn>
                    </div>
                  )}
                </RowTop>
                {l.metrics && <p style={{margin:'8px 0 0',fontSize:13,color:C.muted,fontFamily:mono,lineHeight:1.6}}>{l.metrics}</p>}
                {l.content && <p style={{margin:'6px 0 0',fontSize:13,color:C.text,fontFamily:sans,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{l.content}</p>}
              </Row>
            ))}
          </Rows>
        )
      }

      {modal!==null && (
        <Modal title={modal.editing?'Editar lançamento':'Novo lançamento'} onClose={()=>setModal(null)}>
          <Input label="Nome do lançamento" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} required placeholder="Ex: Lançamento maio 2026"/>
          <Input label="Período" value={form.period} onChange={v=>setForm(f=>({...f,period:v}))} placeholder="Ex: 05/2026 ou Mai–Jun 2026"/>
          <Select label="Status" value={form.status} onChange={v=>setForm(f=>({...f,status:v}))}
            options={[
              {value:'planejamento',label:'Planejamento'},
              {value:'em_andamento',label:'Em andamento'},
              {value:'concluido',label:'Concluído'},
              {value:'pausado',label:'Pausado'},
            ]}/>
          <Input label="Métricas" value={form.metrics} onChange={v=>setForm(f=>({...f,metrics:v}))} rows={2} placeholder="Resultados, números-chave..."/>
          <Input label="Observações" value={form.content} onChange={v=>setForm(f=>({...f,content:v}))} rows={4} placeholder="Contexto, links, notas..."/>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <Btn variant="ghost" onClick={()=>setModal(null)}>Cancelar</Btn>
            <Btn onClick={save}>{saving?'Salvando...':'Salvar'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Login screen ─────────────────────────────────────────────────────────────
function LoginScreen({ slug, onLogin }: { slug:string; onLogin:(admin:boolean)=>void }) {
  const [pw, setPw]   = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/portal/login?slug=${encodeURIComponent(slug)}`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ slug, password:pw }),
        credentials:'include',
      });
      const d = await r.json();
      if (d.role) { onLogin(d.role==='admin'); }
      else { setErr(d.error ?? 'Senha incorreta'); }
    } catch(ex) {
      setErr('Erro de conexão. Tente novamente.');
      console.error('login error', ex);
    }
    setBusy(false);
  }

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',padding:24,fontFamily:sans}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <div style={{fontSize:13,color:C.muted,marginBottom:8,letterSpacing:.5,textTransform:'uppercase' as const}}>APR Digital</div>
          <h1 style={{fontFamily:serif,fontWeight:400,fontSize:32,color:C.text,margin:0}}>Portal do Cliente</h1>
          <p style={{fontSize:14,color:C.muted,margin:'10px 0 0',lineHeight:1.6}}>Acompanhe relatórios, tarefas e lançamentos do seu projeto.</p>
        </div>
        <form onSubmit={submit} style={{background:C.surface,borderRadius:14,padding:'28px 24px',border:`1px solid ${C.line}`}}>
          <Input label="Senha de acesso" type="password" value={pw} onChange={setPw} required/>
          {err && <p style={{color:C.bad,fontSize:13,margin:'-8px 0 12px',fontFamily:sans}}>{err}</p>}
          <Btn type="submit" style={{width:'100%',justifyContent:'center'}}>
            {busy ? 'Verificando...' : 'Entrar'}
          </Btn>
        </form>
      </div>
    </div>
  );
}

// ─── Sidebar nav item ─────────────────────────────────────────────────────────
function NavItem({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      style={{
        display:'block', width:'100%', textAlign:'left', padding:'9px 12px',
        borderRadius:8, border:'none', cursor:'pointer',
        background: active ? C.surface2 : 'transparent',
        color: active ? C.text : C.muted,
        fontFamily:sans, fontSize:14, fontWeight: active ? 500 : 400,
        transition:'background .15s, color .15s',
      }}>
      {label}
    </button>
  );
}

// ─── Main Portal Client ───────────────────────────────────────────────────────
type Tab = 'relatorios' | 'tarefas' | 'links' | 'lancamentos';

export default function PortalClient({
  slug, clientName, isLoggedIn: initLoggedIn, isAdmin: initAdmin,
}: {
  slug: string; clientName: string; isLoggedIn: boolean; isAdmin: boolean;
}) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState(initLoggedIn);
  const [isAdmin, setIsAdmin]   = useState(initAdmin);
  const [tab, setTab]           = useState<Tab>('relatorios');

  async function logout() {
    await fetch(`/api/portal/logout?slug=${encodeURIComponent(slug)}`, { method:'POST', credentials:'include' });
    setLoggedIn(false); setIsAdmin(false);
    router.refresh();
  }

  if (!loggedIn) {
    return <LoginScreen slug={slug} onLogin={(admin) => { setLoggedIn(true); setIsAdmin(admin); }}/>;
  }

  const tabs: { id:Tab; label:string }[] = [
    { id:'relatorios',  label:'Relatórios' },
    { id:'tarefas',     label:'Tarefas' },
    { id:'links',       label:'Links' },
    { id:'lancamentos', label:'Lançamentos' },
  ];

  return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',fontFamily:sans}}>
      {/* Sidebar */}
      <aside style={{
        width:260, flexShrink:0, background:C.surface,
        borderRight:`1px solid ${C.line}`,
        display:'flex', flexDirection:'column',
        padding:'28px 20px',
        position:'sticky', top:0, height:'100vh', overflowY:'auto',
      }}>
        {/* Client identity */}
        <div style={{marginBottom:28}}>
          <div style={{fontFamily:serif, fontWeight:400, fontSize:22, color:C.text, lineHeight:1.2, marginBottom:4}}>
            {clientName}
          </div>
          <div style={{fontSize:13, color:C.muted}}>Portal do cliente</div>
        </div>

        {/* Nav */}
        <nav style={{flex:1}}>
          {tabs.map(t=>(
            <NavItem key={t.id} label={t.label} active={tab===t.id} onClick={()=>setTab(t.id)}/>
          ))}
        </nav>

        {/* Footer */}
        <div style={{marginTop:'auto',paddingTop:20,borderTop:`1px solid ${C.line}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
            <div style={{
              width:32, height:32, borderRadius:'50%',
              background:C.text, color:C.bg,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:600, flexShrink:0,
            }}>AP</div>
            <div>
              <div style={{fontSize:13, fontWeight:500, color:C.text, fontFamily:sans}}>Ana Paula Romano</div>
              <div style={{fontSize:11, color:C.muted}}>APR Digital</div>
            </div>
          </div>
          {isAdmin && (
            <div style={{fontSize:11,marginBottom:8,fontFamily:mono,
                         background:C.accentBg,color:C.accent,padding:'3px 8px',borderRadius:99,display:'inline-block'}}>
              Admin
            </div>
          )}
          <button type="button" onClick={logout}
            style={{display:'block',width:'100%',textAlign:'left',padding:'7px 12px',borderRadius:8,
                    border:'none',cursor:'pointer',background:'transparent',color:C.muted,
                    fontFamily:sans,fontSize:13,marginTop:4}}>
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{flex:1, padding:'40px 48px', maxWidth:900, minWidth:0}}>
        {tab==='relatorios'  && <ReportsSection slug={slug} isAdmin={isAdmin}/>}
        {tab==='tarefas'     && <TasksSection   slug={slug} isAdmin={isAdmin}/>}
        {tab==='links'       && <LinksSection   slug={slug} isAdmin={isAdmin}/>}
        {tab==='lancamentos' && <LaunchesSection slug={slug} isAdmin={isAdmin}/>}
      </main>
    </div>
  );
}
