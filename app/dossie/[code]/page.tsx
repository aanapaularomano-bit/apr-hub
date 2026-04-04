'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useParams } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DossiePage() {
  const params = useParams();
  const code = params?.code as string;
  const [dossie, setDossie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (code) load(); }, [code]);

  async function load() {
    const { data } = await supabase.from('client_dossies').select('*').eq('dossie_code', code).single();
    setDossie(data);
    setLoading(false);
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06060f' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <div style={{ color: '#6b6b90', fontSize: 14 }}>Carregando dossiê...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (!dossie) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06060f' }}>
      <div style={{ textAlign: 'center', color: '#e8e8f0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Dossiê não encontrado</h1>
        <p style={{ color: '#6b6b90', fontSize: 14 }}>Verifique o link com a agência.</p>
      </div>
    </div>
  );

  const sections = dossie.sections || [];

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e8e8f0', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(99,102,241,0.1)', padding: '24px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: '#6366f1', textTransform: 'uppercase', marginBottom: 8 }}>
            {dossie.dossie_type || 'DOSSIÊ ESTRATÉGICO'} · CONFIDENCIAL
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{dossie.title}</h1>
          {dossie.subtitle && <p style={{ fontSize: 15, color: '#6b6b90', marginTop: 8, lineHeight: 1.6 }}>{dossie.subtitle}</p>}
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            {dossie.client_name && (
              <div style={{ padding: '6px 14px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#818cf8' }}>
                👤 {dossie.client_name}
              </div>
            )}
            <div style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 11, color: '#6b6b90' }}>
              📅 {new Date(dossie.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {sections.map((section: any, i: number) => (
            <DossieSection key={i} section={section} index={i} />
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid rgba(99,102,241,0.1)' }}>
        <div style={{ fontSize: 10, letterSpacing: '0.15em', color: '#4a4a6a', textTransform: 'uppercase' }}>
          {dossie.agency_name || 'APR Digital'} · Dossiê Exclusivo · Uso Interno
        </div>
      </footer>
    </div>
  );
}

function DossieSection({ section, index }: { section: any; index: number }) {
  const [open, setOpen] = useState(section.type !== 'accordion');
  const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#22c55e', '#ec4899', '#8b5cf6', '#ef4444', '#3b82f6'];
  const accent = section.color || colors[index % colors.length];

  // Section types: text, cards, tags, metrics, accordion, list, quote, highlight
  return (
    <div>
      {/* Section header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: '#4a4a6a', textTransform: 'uppercase', marginBottom: 4 }}>
          {String(index + 1).padStart(2, '0')} · {section.category || 'ANÁLISE'}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: accent, letterSpacing: '-0.01em', textTransform: 'uppercase' }}>{section.title}</h2>
        {section.underline !== false && <div style={{ width: 60, height: 3, background: accent, borderRadius: 2, marginTop: 8 }} />}
      </div>

      {/* Type: text */}
      {section.type === 'text' && (
        <div style={{ fontSize: 14, lineHeight: 1.9, color: '#a0a0c0', whiteSpace: 'pre-wrap' }}>{section.content}</div>
      )}

      {/* Type: cards */}
      {section.type === 'cards' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(section.items?.length || 3, 3)}, 1fr)`, gap: 14 }}>
          {(section.items || []).map((card: any, ci: number) => {
            const cardColor = card.color || colors[ci % colors.length];
            return (
              <div key={ci} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cardColor }} />
                {card.emoji && <div style={{ fontSize: 24, marginBottom: 8 }}>{card.emoji}</div>}
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#e8e8f0' }}>{card.title}</div>
                <div style={{ fontSize: 12, lineHeight: 1.7, color: '#8080a0' }}>{card.description}</div>
                {card.tags && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {card.tags.map((tag: string, ti: number) => (
                      <span key={ti} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 5, background: cardColor + '20', color: cardColor, border: '1px solid ' + cardColor + '40', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {card.metric && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, color: '#6b6b90', textTransform: 'uppercase', marginBottom: 2 }}>{card.metric_label || 'Volume no público'}</div>
                    <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: card.metric + '%', height: '100%', background: cardColor, borderRadius: 2 }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Type: metrics */}
      {section.type === 'metrics' && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(section.items?.length || 4, 4)}, 1fr)`, gap: 12 }}>
          {(section.items || []).map((m: any, mi: number) => (
            <div key={mi} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
              {m.icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{m.icon}</div>}
              <div style={{ fontSize: 24, fontWeight: 800, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
              <div style={{ fontSize: 10, color: '#6b6b90', textTransform: 'uppercase', marginTop: 4, letterSpacing: '0.05em' }}>{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Type: tags */}
      {section.type === 'tags' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(section.items || []).map((tag: any, ti: number) => {
            const tagColor = tag.color || colors[ti % colors.length];
            return (
              <span key={ti} style={{ fontSize: 11, fontWeight: 700, padding: '6px 14px', borderRadius: 6, background: tagColor + '15', color: tagColor, border: '1px solid ' + tagColor + '30', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {typeof tag === 'string' ? tag : tag.label}
              </span>
            );
          })}
        </div>
      )}

      {/* Type: accordion */}
      {section.type === 'accordion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(section.items || []).map((item: any, ai: number) => (
            <AccordionItem key={ai} item={item} index={ai} accent={accent} />
          ))}
        </div>
      )}

      {/* Type: list */}
      {section.type === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(section.items || []).map((item: any, li: number) => (
            <div key={li} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10 }}>
              <span style={{ color: accent, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, flexShrink: 0 }}>{String(li + 1).padStart(2, '0')}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#e8e8f0', marginBottom: 2 }}>{typeof item === 'string' ? item : item.title}</div>
                {item.description && <div style={{ fontSize: 12, color: '#6b6b90', lineHeight: 1.6 }}>{item.description}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Type: quote */}
      {section.type === 'quote' && (
        <div style={{ borderLeft: `3px solid ${accent}`, padding: '16px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: '0 10px 10px 0' }}>
          <div style={{ fontSize: 16, fontStyle: 'italic', lineHeight: 1.8, color: '#c0c0d0' }}>"{section.content}"</div>
          {section.author && <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginTop: 8 }}>— {section.author}</div>}
        </div>
      )}

      {/* Type: highlight */}
      {section.type === 'highlight' && (
        <div style={{ background: accent + '10', border: '1px solid ' + accent + '25', borderRadius: 14, padding: '24px 28px' }}>
          <div style={{ fontSize: 15, lineHeight: 1.8, color: '#d0d0e0', whiteSpace: 'pre-wrap' }}>{section.content}</div>
        </div>
      )}
    </div>
  );
}

function AccordionItem({ item, index, accent }: { item: any; index: number; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', cursor: 'pointer' }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#c0c0d0' }}>
          {String(index + 1).padStart(2, '0')} · {item.title}
        </span>
        <span style={{ color: accent, fontSize: 16, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
      </div>
      {open && (
        <div style={{ padding: '0 20px 18px', fontSize: 13, lineHeight: 1.8, color: '#8080a0', whiteSpace: 'pre-wrap' }}>
          {item.content}
          {item.tags && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {item.tags.map((t: string, ti: number) => (
                <span key={ti} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: accent + '15', color: accent, textTransform: 'uppercase' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
