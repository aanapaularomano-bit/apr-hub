'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TYPES = [
  { k: 'cro', l: '🔍 Análise CRO', desc: 'Análise de conversão do site/LP' },
  { k: 'pesquisa', l: '📋 Pesquisa de Leads', desc: 'Perfil e qualificação do público' },
  { k: 'copy', l: '✍️ Ângulos de Copy', desc: 'Dores, objeções e ângulos de venda' },
  { k: 'estrategia', l: '🎯 Estratégia Completa', desc: 'Dossiê estratégico full' },
  { k: 'criativo', l: '🎨 Briefing Criativo', desc: 'Direcionamento visual e criativos' },
  { k: 'funil', l: '📊 Análise de Funil', desc: 'Performance e otimizações do funil' },
  { k: 'debriefing', l: '📝 Debriefing', desc: 'Análise pós-lançamento' },
  { k: 'custom', l: '⚡ Personalizado', desc: 'Você define o conteúdo' },
];

const inputS = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const };
const labelS = { fontSize: 12, fontWeight: 600 as const, color: 'rgba(255,255,255,0.3)', display: 'block' as const, marginBottom: 4, textTransform: 'uppercase' as const };
const btnS = (color: string, extra?: any) => ({ background: color + '15', border: '1px solid ' + color + '30', borderRadius: 10, padding: '10px 18px', color, cursor: 'pointer' as const, fontSize: 14, fontWeight: 600, ...extra });

interface DossiesProps { client: any; user: any; }

export default function Dossies({ client, user }: DossiesProps) {
  const [dossies, setDossies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState('estrategia');
  const [title, setTitle] = useState('');
  const [rawData, setRawData] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => { loadDossies(); }, [client.id]);

  async function loadDossies() {
    setLoading(true);
    const { data } = await supabase.from('client_dossies').select('*').eq('client_id', client.id).order('created_at', { ascending: false });
    setDossies(data || []);
    setLoading(false);
  }

  async function generateDossie() {
    if (!rawData.trim()) return;
    setGenerating(true);

    const typeInfo = TYPES.find(t => t.k === selectedType) || TYPES[7];
    const dossieTitle = title.trim() || (typeInfo.l.split(' ').slice(1).join(' ') + ' — ' + client.name);

    const prompt = `Você é a Alice, estrategista digital sênior da APR Digital. Gere um DOSSIÊ ESTRATÉGICO visual e profissional.

CLIENTE: ${client.name}
TIPO: ${typeInfo.l} — ${typeInfo.desc}
NICHO: ${client.niche || 'não informado'}
PRODUTO: ${client.product || 'não informado'}

DADOS FORNECIDOS:
${rawData}

Gere o dossiê como um JSON puro (sem markdown, sem backticks). O formato é um array de SECTIONS. Cada section tem:
- "title": título da seção (curto, impactante)
- "category": categoria curta (ex: "ANÁLISE", "ESTRATÉGIA", "COPY", "PERFIL", "INSIGHTS")
- "type": um de: "text", "cards", "metrics", "tags", "accordion", "list", "quote", "highlight"
- "content": texto (para types text, quote, highlight)
- "items": array (para types cards, metrics, tags, accordion, list)

TIPOS DE SECTION:
- "text": parágrafo de análise. content = string
- "cards": cards visuais. items = [{title, description, emoji, tags:[], metric:0-100, metric_label}]
- "metrics": KPIs grandes. items = [{value, label, icon}]
- "tags": badges/tags. items = [{label, color}] ou ["tag1","tag2"]
- "accordion": seções expansíveis. items = [{title, content, tags:[]}]
- "list": lista numerada. items = [{title, description}]
- "quote": citação destacada. content = texto, author = string
- "highlight": bloco destacado. content = texto

REGRAS:
- Gere entre 5 e 10 seções variando os tipos para ficar visualmente rico
- Use linguagem profissional mas acessível
- Seja ESPECÍFICO com os dados fornecidos, não genérico
- Para cards, use emojis relevantes e tags impactantes
- Para métricas, use dados reais dos dados fornecidos
- Comece com métricas/overview, depois aprofunde
- Termine com ações recomendadas ou próximos passos
- Tudo em português do Brasil

Retorne APENAS o JSON array de sections.`;

    try {
      const res = await fetch('/api/generate-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
  const text = data.content?.[0]?.text || '';
      console.log('AI RAW:', text.substring(0, 200));
      if (!text) { alert('❌ IA não retornou resposta. Verifique a API key.'); setGenerating(false); return; }
      const cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      let sections;
      try { sections = JSON.parse(cleanText); } catch (e) { console.error('JSON PARSE ERROR:', cleanText.substring(cleanText.length - 100)); alert('❌ Resposta da IA veio incompleta. Tente com menos dados.'); setGenerating(false); return; }

      if (Array.isArray(sections)) {
        const code = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
        const { data: saved } = await supabase.from('client_dossies').insert({
          client_id: client.id,
          user_id: user.id,
          dossie_code: code,
          title: dossieTitle,
          subtitle: typeInfo.desc,
          dossie_type: typeInfo.l.replace(/^[^\s]+\s/, '').toUpperCase(),
          client_name: client.name,
          sections,
        }).select().single();

        if (saved) {
          setDossies([saved, ...dossies]);
          setCreating(false);
          setRawData('');
          setTitle('');
          window.open('/dossie/' + code, '_blank');
        }
      }
    } catch (err) {
      console.error('DOSSIE ERROR:', err);
      alert('❌ Erro: ' + (err instanceof Error ? err.message : String(err)));
    }
    setGenerating(false);
  }

  async function deleteDossie(id: string) {
    if (!confirm('Excluir este dossiê?')) return;
    await supabase.from('client_dossies').delete().eq('id', id);
    setDossies(dossies.filter(d => d.id !== id));
  }

  function copyLink(code: string) {
    const url = window.location.origin + '/dossie/' + code;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const T = { card: 'rgba(255,255,255,0.02)', bdr: 'rgba(255,255,255,0.06)', tx: '#e2e8f0', mt: 'rgba(255,255,255,0.4)', mt2: 'rgba(255,255,255,0.2)', mo: "'JetBrains Mono', monospace" };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: T.mt }}>Carregando dossiês...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>📄 Dossiês — {client.name}</h3>
        <button onClick={() => setCreating(true)} style={btnS('#8b5cf6', { fontSize: 13, padding: '8px 16px' })}>+ Novo Dossiê</button>
      </div>

      {creating && (
        <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(99,102,241,0.03))', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 14, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 18 }}>🤖</span>
            <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Gerar Dossiê com IA</h4>
            <button onClick={() => setCreating(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: T.mt, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelS}>Tipo de Dossiê</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {TYPES.map(t => (
                <button key={t.k} onClick={() => setSelectedType(t.k)} style={{ padding: '10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'left' as const, background: selectedType === t.k ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)', border: selectedType === t.k ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)', color: selectedType === t.k ? '#a5b4fc' : T.mt }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{t.l}</div>
                  <div style={{ fontSize: 10, color: T.mt2, marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelS}>Título (opcional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Dossiê de Conversão — Site Isabela Cabral" style={inputS} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelS}>Cole todos os dados aqui (pesquisa, métricas, análise, contexto...)</label>
            <textarea value={rawData} onChange={e => setRawData(e.target.value)} placeholder={"Cole aqui tudo que a IA precisa saber:\n\n• Dados da pesquisa de leads\n• Métricas do funil\n• Análise do site/LP\n• Perfil do público\n• Dores e objeções identificadas\n• Qualquer contexto relevante\n\nQuanto mais dados, melhor o dossiê!"} rows={10} style={{ ...inputS, resize: 'vertical' as const, fontSize: 13, lineHeight: 1.6 }} />
          </div>

          <button onClick={generateDossie} disabled={!rawData.trim() || generating} style={{ padding: '12px 28px', borderRadius: 10, border: 'none', background: rawData.trim() && !generating ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : 'rgba(255,255,255,0.05)', color: rawData.trim() && !generating ? '#fff' : T.mt, cursor: rawData.trim() && !generating ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700 }}>
            {generating ? '🤖 Alice está gerando o dossiê...' : '⚡ Gerar Dossiê'}
          </button>
        </div>
      )}

      {dossies.length === 0 && !creating ? (
        <div style={{ textAlign: 'center' as const, padding: 50, color: T.mt }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
          <p style={{ fontSize: 15, marginBottom: 8 }}>Nenhum dossiê criado</p>
          <p style={{ fontSize: 13, color: T.mt2 }}>Crie dossiês visuais pra impressionar seus clientes</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {dossies.map(d => (
            <div key={d.id} style={{ background: T.card, border: '1px solid ' + T.bdr, borderRadius: 12, padding: 18, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: T.tx, marginBottom: 4 }}>{d.title}</div>
              <div style={{ fontSize: 11, color: T.mt, marginBottom: 8 }}>{d.dossie_type} · {new Date(d.created_at).toLocaleDateString('pt-BR')}</div>
              <div style={{ fontSize: 11, color: T.mt2, marginBottom: 12 }}>{(d.sections || []).length} seções</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={'/dossie/' + d.dossie_code} target="_blank" rel="noopener noreferrer" style={btnS('#6366f1', { fontSize: 11, padding: '6px 12px', textDecoration: 'none' })}>👁️ Ver</a>
                <button onClick={() => copyLink(d.dossie_code)} style={btnS(copied === d.dossie_code ? '#22c55e' : '#3b82f6', { fontSize: 11, padding: '6px 12px' })}>{copied === d.dossie_code ? '✅ Copiado!' : '🔗 Link'}</button>
                <button onClick={() => deleteDossie(d.id)} style={btnS('#ef4444', { fontSize: 11, padding: '6px 12px', marginLeft: 'auto' })}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
