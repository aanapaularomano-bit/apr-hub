'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  { k: 'trafego', l: '📢 Tráfego', color: '#3b82f6' },
  { k: 'criativo', l: '🎨 Criativo', color: '#8b5cf6' },
  { k: 'copy', l: '✍️ Copy', color: '#ec4899' },
  { k: 'estrategia', l: '🎯 Estratégia', color: '#f59e0b' },
  { k: 'funil', l: '📊 Funil', color: '#06b6d4' },
  { k: 'operacional', l: '⚙️ Operacional', color: '#64748b' },
  { k: 'reuniao', l: '🤝 Reunião', color: '#22c55e' },
  { k: 'entrega', l: '📦 Entrega', color: '#ef4444' },
];

const PRIORITIES = [
  { k: 'urgente', l: '🔴 Urgente', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { k: 'alta', l: '🟠 Alta', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  { k: 'normal', l: '🟡 Normal', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  { k: 'baixa', l: '🟢 Baixa', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
];

const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };
const btnS = (color: string, extra?: any) => ({ background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10, padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra });

interface ProximasAcoesProps { client: any; user: any; }

export default function ProximasAcoes({ client, user }: ProximasAcoesProps) {
  const [acoes, setAcoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [newAction, setNewAction] = useState({ title: '', category: 'trafego', priority: 'normal', due_date: '' });
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending');

  useEffect(() => { loadAcoes(); }, [client.id]);

  async function loadAcoes() {
    setLoading(true);
    const { data } = await supabase.from('client_notes').select('*').eq('client_id', client.id).like('text', 'ACTION:%').order('created_at', { ascending: false });
    const parsed = (data || []).map((n: any) => {
      try { const json = JSON.parse(n.text.replace('ACTION:', '')); return { ...json, id: n.id, created_at: n.created_at }; } catch { return null; }
    }).filter(Boolean);
    setAcoes(parsed);
    setLoading(false);
  }

  async function addAction(action: any) {
    const payload = { title: action.title, category: action.category || 'operacional', priority: action.priority || 'normal', due_date: action.due_date || '', done: false };
    const text = 'ACTION:' + JSON.stringify(payload);
    const { data } = await supabase.from('client_notes').insert({ client_id: client.id, text, user_id: user.id }).select().single();
    if (data) { setAcoes([{ ...payload, id: data.id, created_at: data.created_at }, ...acoes]); }
  }

  async function toggleDone(acao: any) {
    const newDone = !acao.done;
    const payload: any = { title: acao.title, category: acao.category, priority: acao.priority, due_date: acao.due_date, done: newDone };
    if (newDone) payload.done_at = new Date().toISOString();
    const text = 'ACTION:' + JSON.stringify(payload);
    await supabase.from('client_notes').update({ text }).eq('id', acao.id);
    if (newDone) {
      const logCategory = acao.category === 'trafego' ? 'otimizacao' : acao.category === 'criativo' || acao.category === 'copy' ? 'criativo' : acao.category === 'reuniao' ? 'reuniao' : acao.category === 'estrategia' || acao.category === 'funil' ? 'estrategia' : 'outro';
      const logText = 'LOG:' + logCategory + ':✅ ' + acao.title;
      await supabase.from('client_notes').insert({ client_id: client.id, text: logText, user_id: user.id });
    }
    setAcoes(acoes.map(a => a.id === acao.id ? { ...a, done: newDone, done_at: newDone ? new Date().toISOString() : undefined } : a));
  }

  async function deleteAction(id: string) {
    await supabase.from('client_notes').delete().eq('id', id);
    setAcoes(acoes.filter(a => a.id !== id));
  }

  async function generateWithAI() {
    if (!aiContext.trim()) return;
    setAiLoading(true);
    setAiSuggestions([]);
    const prompt = 'Você é a Alice, estrategista digital sênior da APR Digital. Analise o contexto do cliente e gere uma lista de PRÓXIMAS AÇÕES prioritárias.\n\nCLIENTE: ' + client.name + '\nSQUAD: ' + client.squad + '\nFASE: ' + client.phase + '\nNICHO: ' + (client.niche || 'não informado') + '\nPRODUTO: ' + (client.product || 'não informado') + '\nFEE: R$ ' + (client.fee || 0) + '/mês\n\nCONTEXTO FORNECIDO PELA ANA PAULA:\n' + aiContext + '\n\nGere entre 5 e 10 ações concretas e específicas. Para cada ação, retorne EXATAMENTE neste formato JSON (sem markdown, sem backticks, apenas o JSON puro):\n\n[{"title":"Descrição clara","category":"trafego|criativo|copy|estrategia|funil|operacional|reuniao|entrega","priority":"urgente|alta|normal|baixa","due_date_suggestion":"hoje|esta semana|próxima semana|em 15 dias|este mês"}]\n\nREGRAS:\n- Ações devem ser ESPECÍFICAS pro contexto, não genéricas\n- Priorize por impacto no resultado do cliente\n- Use termos do mercado brasileiro de marketing digital\n- Cada ação deve ser um entregável ou ação concreta\n- Ordene por prioridade (urgente primeiro)';
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }) });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const suggestions = JSON.parse(cleanText);
      if (Array.isArray(suggestions)) { setAiSuggestions(suggestions); }
    } catch (err) {
      setAiSuggestions([{ title: '⚠️ Erro ao gerar sugestões. Tente novamente.', category: 'operacional', priority: 'normal', error: true }]);
    }
    setAiLoading(false);
  }

  async function acceptSuggestion(suggestion: any) {
    if (suggestion.error) return;
    await addAction({ title: suggestion.title, category: suggestion.category || 'operacional', priority: suggestion.priority || 'normal', due_date: '' });
    setAiSuggestions(aiSuggestions.filter(s => s.title !== suggestion.title));
  }

  async function acceptAllSuggestions() {
    for (const s of aiSuggestions.filter(s => !s.error)) {
      await addAction({ title: s.title, category: s.category || 'operacional', priority: s.priority || 'normal', due_date: '' });
    }
    setAiSuggestions([]);
    setShowAI(false);
    setAiContext('');
  }

  const pending = acoes.filter(a => !a.done);
  const done = acoes.filter(a => a.done);
  const total = acoes.length;
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0;
  const filtered = filter === 'all' ? acoes : filter === 'pending' ? pending : done;
  const todayStr = new Date().toISOString().split('T')[0];

  const T = { bg: '#08080f', card: 'rgba(255,255,255,0.02)', bdr: 'rgba(255,255,255,0.06)', tx: '#e2e8f0', mt: 'rgba(255,255,255,0.4)', mt2: 'rgba(255,255,255,0.2)', mo: "'JetBrains Mono', monospace" };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt }}>Carregando ações...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' as const, gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>🚀 Próximas Ações — {client.name}</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setShowAI(true); setShowManual(false); }} style={btnS('#8b5cf6', { fontSize: 13, padding: '8px 16px' })}>🤖 Gerar com IA</button>
          <button onClick={() => { setShowManual(true); setShowAI(false); }} style={btnS('#22c55e', { fontSize: 13, padding: '8px 16px' })}>+ Manual</button>
        </div>
      </div>

      {total > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: T.mt }}><b style={{ color: '#22c55e' }}>{done.length}</b> de <b style={{ color: T.tx }}>{total}</b> concluídas</span>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mo, color: pct === 100 ? '#22c55e' : pct > 50 ? '#f59e0b' : '#3b82f6' }}>{pct}%</span>
          </div>
          <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', borderRadius: 4, background: pct === 100 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#6366f1,#8b5cf6)', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

      {showAI && (
        <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.03))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Alice — Gerador de Ações</h4>
            <button onClick={() => { setShowAI(false); setAiSuggestions([]); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.mt, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelS}>Descreva o momento/contexto do cliente:</label>
            <textarea value={aiContext} onChange={e => setAiContext(e.target.value)} placeholder="Ex: Estamos na fase de captação do lançamento. CPL está em R$12, meta é R$8. Precisamos de novos criativos em vídeo. Reunião com cliente semana que vem..." rows={4} style={{ ...inputS, resize: 'vertical' as const }} />
          </div>
          <button onClick={generateWithAI} disabled={!aiContext.trim() || aiLoading} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: aiContext.trim() && !aiLoading ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.05)', color: aiContext.trim() && !aiLoading ? '#fff' : T.mt, cursor: aiContext.trim() && !aiLoading ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>
            {aiLoading ? '🤖 Alice está analisando...' : '⚡ Gerar Próximas Ações'}
          </button>
          {aiSuggestions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#c4b5fd' }}>🤖 Sugestões da Alice ({aiSuggestions.length})</span>
                <button onClick={acceptAllSuggestions} style={btnS('#22c55e', { fontSize: 12, padding: '6px 14px' })}>✅ Aceitar Todas</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiSuggestions.map((s, i) => {
                  const cat = CATEGORIES.find(c => c.k === s.category) || CATEGORIES[5];
                  const pri = PRIORITIES.find(p => p.k === s.priority) || PRIORITIES[2];
                  return (
                    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: cat.color + '15', color: cat.color }}>{cat.l}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: pri.bg, color: pri.color }}>{pri.l}</span>
                          {s.due_date_suggestion && <span style={{ fontSize: 10, color: T.mt }}>📅 {s.due_date_suggestion}</span>}
                        </div>
                      </div>
                      <button onClick={() => acceptSuggestion(s)} style={btnS('#22c55e', { fontSize: 12, padding: '6px 12px' })}>+ Adicionar</button>
                      <button onClick={() => setAiSuggestions(aiSuggestions.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 14 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showManual && (
        <div style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 14, padding: 20, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Adicionar Ação Manual</h4>
            <button onClick={() => setShowManual(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.mt, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelS}>Ação / Entregável</label>
            <input value={newAction.title} onChange={e => setNewAction({ ...newAction, title: e.target.value })} placeholder="Ex: Criar 3 criativos em vídeo para captação" style={inputS} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelS}>Categoria</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {CATEGORIES.map(c => (
                  <button key={c.k} onClick={() => setNewAction({ ...newAction, category: c.k })} style={{ padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: newAction.category === c.k ? c.color + '20' : 'rgba(255,255,255,0.03)', border: newAction.category === c.k ? '1px solid ' + c.color + '40' : '1px solid ' + T.bdr, color: newAction.category === c.k ? c.color : T.mt }}>{c.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelS}>Prioridade</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {PRIORITIES.map(p => (
                  <button key={p.k} onClick={() => setNewAction({ ...newAction, priority: p.k })} style={{ padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, background: newAction.priority === p.k ? p.bg : 'rgba(255,255,255,0.03)', border: newAction.priority === p.k ? '1px solid ' + p.color + '40' : '1px solid ' + T.bdr, color: newAction.priority === p.k ? p.color : T.mt }}>{p.l}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelS}>Prazo (opcional)</label>
              <input type="date" value={newAction.due_date} onChange={e => setNewAction({ ...newAction, due_date: e.target.value })} style={inputS} />
            </div>
          </div>
          <button onClick={async () => { if (!newAction.title.trim()) return; await addAction(newAction); setNewAction({ title: '', category: 'trafego', priority: 'normal', due_date: '' }); }} disabled={!newAction.title.trim()} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: newAction.title.trim() ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.05)', color: newAction.title.trim() ? '#fff' : T.mt, cursor: newAction.title.trim() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700 }}>+ Adicionar Ação</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
        {([['pending', '⏳ Pendentes', pending.length], ['done', '✅ Feitas', done.length], ['all', '📋 Todas', total]] as const).map(([k, l, count]) => (
          <button key={k} onClick={() => setFilter(k as any)} style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filter === k ? 'rgba(99,102,241,0.2)' : 'transparent', color: filter === k ? '#a5b4fc' : T.mt }}>{l} <span style={{ fontFamily: T.mo, marginLeft: 4 }}>{count}</span></button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center' as const, padding: 40, color: T.mt }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🚀</div>
          <p style={{ fontSize: 15, marginBottom: 8 }}>{filter === 'done' ? 'Nenhuma ação concluída ainda' : filter === 'pending' ? 'Todas as ações foram concluídas! 🎉' : 'Nenhuma ação criada'}</p>
          <p style={{ fontSize: 13, color: T.mt2 }}>Use o botão "🤖 Gerar com IA" ou "+ Manual" para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['urgente', 'alta', 'normal', 'baixa'].map(prioKey => {
            const items = filtered.filter(a => a.priority === prioKey);
            if (items.length === 0) return null;
            const pri = PRIORITIES.find(p => p.k === prioKey) || PRIORITIES[2];
            return (
              <div key={prioKey}>
                <div style={{ fontSize: 11, fontWeight: 700, color: pri.color, textTransform: 'uppercase' as const, letterSpacing: '0.08em', padding: '8px 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>{pri.l} ({items.length})</div>
                {items.map(acao => {
                  const cat = CATEGORIES.find(c => c.k === acao.category) || CATEGORIES[5];
                  const isOverdue = acao.due_date && !acao.done && acao.due_date < todayStr;
                  return (
                    <div key={acao.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: acao.done ? 'rgba(34,197,94,0.03)' : isOverdue ? 'rgba(239,68,68,0.04)' : T.card, border: '1px solid ' + (acao.done ? 'rgba(34,197,94,0.15)' : isOverdue ? 'rgba(239,68,68,0.2)' : T.bdr), borderRadius: 10, marginBottom: 6 }}>
                      <div onClick={() => toggleDone(acao)} style={{ width: 24, height: 24, borderRadius: 7, cursor: 'pointer', flexShrink: 0, border: '2px solid ' + (acao.done ? '#22c55e' : 'rgba(255,255,255,0.15)'), background: acao.done ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', transition: 'all 0.2s' }}>{acao.done ? '✓' : ''}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: acao.done ? T.mt : T.tx, textDecoration: acao.done ? 'line-through' : 'none', marginBottom: 4 }}>{acao.title}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: cat.color + '15', color: cat.color }}>{cat.l}</span>
                          {acao.due_date && <span style={{ fontSize: 10, fontWeight: 600, color: isOverdue ? '#ef4444' : T.mt, fontFamily: T.mo }}>📅 {new Date(acao.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{isOverdue ? ' ⚠️' : ''}</span>}
                          {acao.done && acao.done_at && <span style={{ fontSize: 10, color: '#22c55e' }}>✅ {new Date(acao.done_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteAction(acao.id)} style={{ background: 'none', border: 'none', color: T.mt2, cursor: 'pointer', fontSize: 12, padding: 4 }}>🗑️</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
