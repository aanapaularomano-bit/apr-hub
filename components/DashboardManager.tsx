'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const fB = (n: number) => 'R$ ' + (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface DashManagerProps { user: any; clients: any[]; T: any; }

export default function DashboardManager({ user, clients, T }: DashManagerProps) {
  const [dashes, setDashes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [editTab, setEditTab] = useState('geral');
  const [saving, setSaving] = useState(false);
  const [newDash, setNewDash] = useState({ title: '', client_id: '', template: 'simple', theme: 'dark' });
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadDashes(); }, []);

  async function loadDashes() {
    const { data } = await supabase.from('client_dashboards').select('*, clients(name)').eq('user_id', user.id).order('created_at', { ascending: false });
    setDashes(data || []);
  }

  async function createDash() {
    if (!newDash.title) return;
    const code = Math.random().toString(36).substring(2, 10);
    const { data } = await supabase.from('client_dashboards').insert({
      ...newDash, dash_code: code, user_id: user.id,
      client_id: newDash.client_id || null,
    }).select('*, clients(name)').single();
    if (data) {
      setDashes([data, ...dashes]);
      setSelected(data);
      setCreating(false);
      setNewDash({ title: '', client_id: '', template: 'simple', theme: 'dark' });
    }
  }

  async function saveDash(updates: any) {
    if (!selected) return;
    setSaving(true);
    await supabase.from('client_dashboards').update(updates).eq('id', selected.id);
    const updated = { ...selected, ...updates };
    setSelected(updated);
    setDashes(dashes.map(d => d.id === selected.id ? updated : d));
    setSaving(false);
  }

  async function deleteDash(id: string) {
    if (!confirm('Tem certeza que deseja excluir este dashboard?')) return;
    await supabase.from('client_dashboards').delete().eq('id', id);
    setDashes(dashes.filter(d => d.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function copyLink() {
    if (!selected) return;
    const url = `${window.location.origin}/dash/${selected.dash_code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ═══ FIELD EDITOR HELPER ═══
  const inputStyle = { width: '100%', background: T.bg3 || '#1a1a3e', color: T.tx || '#e8e8f0', border: `1px solid ${T.bdr || 'rgba(99,102,241,0.15)'}`, borderRadius: 8, padding: '8px 12px', fontSize: 12, outline: 'none' };

  function Field({ label, field, type = 'number', json = false }: { label: string; field: string; type?: string; json?: boolean }) {
    const rawVal = selected?.[field];
    const val = json ? JSON.stringify(rawVal || (type === 'array' ? [] : ''), null, 2) : (rawVal ?? '');
    return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 10, color: T.tx3 || '#6b6b90', textTransform: 'uppercase' as const, fontWeight: 700, letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{label}</label>
        {json ? (
          <textarea
            value={val}
            onChange={e => {
              try { const parsed = JSON.parse(e.target.value); saveDash({ [field]: parsed }); } catch {}
              setSelected({ ...selected, [field]: e.target.value });
            }}
            onBlur={e => { try { const parsed = JSON.parse(e.target.value); saveDash({ [field]: parsed }); } catch {} }}
            style={{ ...inputStyle, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", minHeight: 120, resize: 'vertical' as const }}
          />
        ) : type === 'textarea' ? (
          <textarea
            value={val}
            onChange={e => setSelected({ ...selected, [field]: e.target.value })}
            onBlur={e => saveDash({ [field]: e.target.value })}
            style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }}
          />
        ) : (
          <input
            type={type === 'number' ? 'text' : type}
            value={val}
            onChange={e => setSelected({ ...selected, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
            onBlur={e => saveDash({ [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })}
            style={inputStyle}
          />
        )}
      </div>
    );
  }

  function FieldRow({ children }: { children: React.ReactNode }) {
    return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>{children}</div>;
  }

  function SectionHeader({ title, icon }: { title: string; icon: string }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.bdr}` }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.tx, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>{title}</span>
      </div>
    );
  }

  // ═══ EDIT TABS ═══
  const editTabs = [
    { k: 'geral', l: '⚙️ Geral' },
    { k: 'captacao', l: '📊 Captação' },
    { k: 'meta_ads', l: '📢 Meta Ads' },
    { k: 'vendas', l: '💰 Vendas' },
    { k: 'publico', l: '👥 Público' },
    { k: 'diario', l: '📅 Diário' },
    { k: 'anuncios', l: '📢 Anúncios' },
    ...(selected?.template === 'complete' || selected?.template === 'mega' ? [
      { k: 'origens', l: '🔗 Origens' },
      { k: 'pesquisa', l: '📋 Pesquisa' },
    ] : []),
    ...(selected?.template === 'mega' ? [
      { k: 'criativos', l: '🎨 Criativos' },
      { k: 'publicos_plat', l: '👥 Públicos Plat.' },
      { k: 'semanal', l: '📅 Semanal' },
      { k: 'qualificacao', l: '🎯 Qualificação' },
      { k: 'temperatura', l: '🌡️ Temperatura' },
    ] : []),
  ];

  // ═══ LIST VIEW ═══
  if (!selected) {
    return (
      <div style={{ padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>📊 Dashboards</h2>
          <button onClick={() => setCreating(true)} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>+ Novo Dashboard</button>
        </div>

        {/* Create modal */}
        {creating && (
          <div style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: 24, marginBottom: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Criar Novo Dashboard</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: T.tx3, fontWeight: 700, display: 'block', marginBottom: 4 }}>TÍTULO</label>
                <input value={newDash.title} onChange={e => setNewDash({ ...newDash, title: e.target.value })} placeholder="Ex: Dashboard Fran Maftum - L1" style={{ width: '100%', padding: '8px 12px', background: T.bg3 || '#1a1a3e', color: T.tx || '#e8e8f0', border: `1px solid ${T.bdr || 'rgba(99,102,241,0.15)'}`, borderRadius: 8, fontSize: 12 }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: T.tx3, fontWeight: 700, display: 'block', marginBottom: 4 }}>CLIENTE</label>
                <select value={newDash.client_id} onChange={e => setNewDash({ ...newDash, client_id: e.target.value })} style={{ width: '100%', padding: '8px 12px', background: T.bg3 || '#1a1a3e', color: T.tx || '#e8e8f0', border: `1px solid ${T.bdr || 'rgba(99,102,241,0.15)'}`, borderRadius: 8, fontSize: 12 }}>
                  <option value="">Sem cliente vinculado</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: T.tx3, fontWeight: 700, display: 'block', marginBottom: 4 }}>TEMPLATE</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ k: 'simple', l: '📊 Simples', d: '2 páginas' }, { k: 'complete', l: '📈 Completo', d: '7 páginas' }, { k: 'mega', l: '🚀 Mega', d: '16+ páginas' }].map(t => (
                    <button key={t.k} onClick={() => setNewDash({ ...newDash, template: t.k })} style={{ flex: 1, padding: '10px 8px', background: newDash.template === t.k ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : T.bg3, color: newDash.template === t.k ? '#fff' : T.tx2, border: `1px solid ${newDash.template === t.k ? '#6366f1' : T.bdr}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{t.l.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{t.l.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{t.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 10, color: T.tx3, fontWeight: 700, display: 'block', marginBottom: 4 }}>TEMA</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ k: 'dark', l: '🌙 Dark', d: 'Estilo Renata Bacha' }, { k: 'light', l: '☀️ Light', d: 'Estilo Priscila Zillo' }].map(t => (
                    <button key={t.k} onClick={() => setNewDash({ ...newDash, theme: t.k })} style={{ flex: 1, padding: '10px 8px', background: newDash.theme === t.k ? (t.k === 'dark' ? '#1a1a3e' : '#f8f7f4') : T.bg3, color: newDash.theme === t.k ? (t.k === 'dark' ? '#e8e8f0' : '#1a1a2e') : T.tx2, border: `1px solid ${newDash.theme === t.k ? '#6366f1' : T.bdr}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' as const }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{t.l.split(' ')[0]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700 }}>{t.l.split(' ').slice(1).join(' ')}</div>
                      <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{t.d}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setCreating(false)} style={{ padding: '8px 16px', background: T.bg3, color: T.tx2, border: `1px solid ${T.bdr}`, borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>Cancelar</button>
              <button onClick={createDash} disabled={!newDash.title} style={{ padding: '8px 20px', background: newDash.title ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : T.bg3, color: newDash.title ? '#fff' : T.tx3, border: 'none', borderRadius: 8, cursor: newDash.title ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 700 }}>Criar Dashboard</button>
            </div>
          </div>
        )}

        {/* Dashboard list */}
        {dashes.length === 0 && !creating ? (
          <div style={{ textAlign: 'center' as const, padding: 60, color: T.tx3 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Nenhum dashboard criado</div>
            <div style={{ fontSize: 13 }}>Crie seu primeiro dashboard para enviar aos clientes</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {dashes.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                onMouseOver={e => (e.currentTarget.style.borderColor = T.accent)}
                onMouseOut={e => (e.currentTarget.style.borderColor = T.bdr)}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: d.template === 'mega' ? 'linear-gradient(90deg, #6366f1, #ec4899)' : d.template === 'complete' ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : T.accent }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: T.tx }}>{d.title}</div>
                    <div style={{ fontSize: 11, color: T.tx3, marginTop: 2 }}>{d.clients?.name || 'Sem cliente'}</div>
                  </div>
                  <div style={{ padding: '3px 8px', background: T.bg3, borderRadius: 6, fontSize: 9, fontWeight: 700, color: T.tx2, textTransform: 'uppercase' as const }}>
                    {d.template === 'mega' ? '🚀 Mega' : d.template === 'complete' ? '📈 Completo' : '📊 Simples'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: T.tx3 }}>Leads: <span style={{ color: T.green, fontWeight: 600 }}>{d.leads_total || 0}</span></div>
                  <div style={{ fontSize: 10, color: T.tx3 }}>ROAS: <span style={{ color: T.yellow, fontWeight: 600 }}>{(d.roas || 0).toFixed(2)}x</span></div>
                  <div style={{ fontSize: 10, color: T.tx3 }}>{d.theme === 'dark' ? '🌙' : '☀️'}</div>
                </div>
                <button onClick={e => { e.stopPropagation(); deleteDash(d.id); }} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ═══ EDIT VIEW ═══
  return (
    <div style={{ padding: 0 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' as const, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSelected(null)} style={{ background: T.bg3, border: `1px solid ${T.bdr}`, borderRadius: 8, padding: '6px 12px', color: T.tx2, cursor: 'pointer', fontSize: 12 }}>← Voltar</button>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{selected.title}</h2>
          <span style={{ padding: '3px 10px', background: T.bg3, borderRadius: 6, fontSize: 10, fontWeight: 700, color: T.accent }}>
            {selected.template === 'mega' ? '🚀 Mega' : selected.template === 'complete' ? '📈 Completo' : '📊 Simples'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={copyLink} style={{ padding: '8px 16px', background: copied ? T.green : T.bg3, color: copied ? '#fff' : T.tx2, border: `1px solid ${T.bdr}`, borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600, transition: 'all 0.2s' }}>
            {copied ? '✅ Link copiado!' : '🔗 Copiar Link Público'}
          </button>
          <a href={`/dash/${selected.dash_code}`} target="_blank" style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            👁️ Visualizar
          </a>
        </div>
      </div>

      {/* Save indicator */}
      {saving && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: T.green, color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, zIndex: 999, animation: 'fadeIn 0.2s' }}>
          💾 Salvando...
        </div>
      )}

      {/* Edit tabs */}
      <div style={{ overflowX: 'auto', marginBottom: 20, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 0, background: T.bg3, borderRadius: 10, padding: 4, width: 'max-content' }}>
          {editTabs.map(t => (
            <button key={t.k} onClick={() => setEditTab(t.k)} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: editTab === t.k ? T.accent : 'transparent', color: editTab === t.k ? '#fff' : T.tx2, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>{t.l}</button>
          ))}
        </div>
      </div>

      {/* Edit content */}
      <div style={{ background: T.card, border: `1px solid ${T.bdr}`, borderRadius: 14, padding: 24 }}>

        {editTab === 'geral' && (
          <>
            <SectionHeader title="Informações Gerais" icon="⚙️" />
            <FieldRow>
              <Field label="Título" field="title" type="text" />
              <Field label="Logo URL" field="logo_url" type="text" />
            </FieldRow>
            <FieldRow>
              <Field label="Data Início" field="date_start" type="date" />
              <Field label="Data Fim" field="date_end" type="date" />
            </FieldRow>
            <FieldRow>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: T.tx3 || '#6b6b90', fontWeight: 700, display: 'block', marginBottom: 4 }}>TEMPLATE</label>
                <select value={selected.template} onChange={e => saveDash({ template: e.target.value })} style={{ ...inputStyle }}>
                  <option value="simple">📊 Simples (2 páginas)</option>
                  <option value="complete">📈 Completo (7 páginas)</option>
                  <option value="mega">🚀 Mega (16+ páginas)</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 10, color: T.tx3 || '#6b6b90', fontWeight: 700, display: 'block', marginBottom: 4 }}>TEMA</label>
                <select value={selected.theme} onChange={e => saveDash({ theme: e.target.value })} style={{ ...inputStyle }}>
                  <option value="dark">🌙 Dark</option>
                  <option value="light">☀️ Light</option>
                </select>
              </div>
            </FieldRow>
            <Field label="Resumo Executivo" field="resumo" type="textarea" />

            <SectionHeader title="Integração Google Sheets (Stract)" icon="📊" />
            <Field label="URL da Planilha Google Sheets" field="sheet_url" type="text" />
            <Field label="Nome da Aba (deixe vazio para primeira aba)" field="sheet_tab" type="text" />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
              <button
                onClick={async () => {
                  if (!selected.sheet_url) { alert('Cole o link da planilha primeiro!'); return; }
                  setSaving(true);
                  try {
                    const res = await fetch('/api/sync-sheets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dashboard_id: selected.id }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert(`✅ Sync concluído!\n\nLeads: ${data.leads}\nInvestimento: R$ ${data.investimento?.toFixed(2)}\nDias: ${data.daily_count}\nAnúncios: ${data.ads_count}`);
                      // Reload dashboard data
                      const { data: updated } = await supabase.from('client_dashboards').select('*, clients(name)').eq('id', selected.id).single();
                      if (updated) { setSelected(updated); setDashes(dashes.map(d => d.id === selected.id ? updated : d)); }
                    } else {
                      alert('❌ Erro: ' + (data.error || 'Desconhecido'));
                    }
                  } catch (err: any) {
                    alert('❌ Erro: ' + err.message);
                  }
                  setSaving(false);
                }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                🔄 Sincronizar Agora
              </button>
              {selected.last_sync && (
                <span style={{ fontSize: 11, color: T.tx3 }}>
                  Último sync: {new Date(selected.last_sync).toLocaleString('pt-BR')}
                </span>
              )}
              <span style={{ fontSize: 10, color: T.tx3, marginLeft: 'auto' }}>
                ⏰ Sync automático a cada 6 horas
              </span>
            </div>
          </>
        )}

        {editTab === 'captacao' && (
          <>
            <SectionHeader title="Orçamento por Etapa" icon="💵" />
            <FieldRow>
              <Field label="Budget Captação" field="budget_captacao" />
              <Field label="Realizado Captação" field="realizado_captacao" />
              <Field label="Budget Aquecimento" field="budget_aquecimento" />
              <Field label="Realizado Aquecimento" field="realizado_aquecimento" />
            </FieldRow>
            <FieldRow>
              <Field label="Budget Lembrete" field="budget_lembrete" />
              <Field label="Realizado Lembrete" field="realizado_lembrete" />
              <Field label="Budget CPLs" field="budget_cpls" />
              <Field label="Realizado CPLs" field="realizado_cpls" />
            </FieldRow>
            <FieldRow>
              <Field label="Budget Carrinho" field="budget_carrinho" />
              <Field label="Realizado Carrinho" field="realizado_carrinho" />
              <Field label="Budget Total" field="budget_total" />
            </FieldRow>

            <SectionHeader title="Captação Geral" icon="📊" />
            <FieldRow>
              <Field label="Leads Total" field="leads_total" />
              <Field label="CPL" field="cpl" />
              <Field label="Investimento" field="investimento" />
              <Field label="Leads Confirmados" field="leads_confirmados" />
            </FieldRow>
            <FieldRow>
              <Field label="Taxa Confirmação (%)" field="taxa_confirmacao" />
              <Field label="Leads WhatsApp" field="leads_whatsapp" />
              <Field label="Grupos WhatsApp" field="grupos_whatsapp" />
              <Field label="Taxa Aderência (%)" field="taxa_aderencia" />
            </FieldRow>
          </>
        )}

        {editTab === 'meta_ads' && (
          <>
            <SectionHeader title="Funil Meta Ads" icon="📢" />
            <FieldRow>
              <Field label="Impressões" field="impressions" />
              <Field label="Alcance" field="alcance" />
              <Field label="Cliques" field="cliques" />
              <Field label="Page Views" field="page_views" />
            </FieldRow>
            <FieldRow>
              <Field label="CTR (%)" field="ctr" />
              <Field label="CPC" field="cpc" />
              <Field label="CPM" field="cpm" />
              <Field label="Taxa Carregamento (%)" field="tx_carregamento" />
            </FieldRow>
            <FieldRow>
              <Field label="Taxa Conversão (%)" field="tx_conversao" />
              <Field label="CPL Google" field="cpl_google" />
              <Field label="CPL Geral" field="cpl_geral" />
            </FieldRow>
          </>
        )}

        {editTab === 'vendas' && (
          <>
            <SectionHeader title="Dados de Vendas" icon="💰" />
            <FieldRow>
              <Field label="Faturamento" field="faturamento" />
              <Field label="Lucro" field="lucro" />
              <Field label="Vendas Total" field="vendas_total" />
              <Field label="ROAS" field="roas" />
            </FieldRow>
            <FieldRow>
              <Field label="CAC" field="cac" />
              <Field label="Taxa Lista (%)" field="taxa_lista" />
              <Field label="Ticket Médio" field="ticket_medio" />
              <Field label="Checkouts" field="checkouts" />
            </FieldRow>
            <FieldRow>
              <Field label="Visitas Pág. Vendas" field="visits_vendas" />
            </FieldRow>

            {(selected.template === 'mega') && (
              <>
                <SectionHeader title="Vendas Diárias (JSON)" icon="📅" />
                <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"date":"01/04","vendas":5,"faturamento":2500,"origem":"Meta","meio":"PIX"{"}"}]</div>
                <Field label="" field="vendas_diarias" json />
              </>
            )}
          </>
        )}

        {editTab === 'publico' && (
          <>
            <SectionHeader title="Público Quente vs Frio" icon="🔥" />
            <FieldRow>
              <Field label="Leads Quentes" field="leads_quentes" />
              <Field label="Leads Frios" field="leads_frios" />
              <Field label="CPL Quente" field="cpl_quente" />
              <Field label="CPL Frio" field="cpl_frio" />
            </FieldRow>
            {(selected.template === 'mega') && (
              <FieldRow>
                <Field label="ROAS Quente" field="roas_quente" />
                <Field label="ROAS Frio" field="roas_frio" />
                <Field label="Invest. Quente" field="invest_quente" />
                <Field label="Invest. Frio" field="invest_frio" />
                <Field label="Fat. Quente" field="fat_quente" />
                <Field label="Fat. Frio" field="fat_frio" />
              </FieldRow>
            )}
          </>
        )}

        {editTab === 'diario' && (
          <>
            <SectionHeader title="Dados Diários (JSON)" icon="📅" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"date":"01/04","leads":50,"cpl":8.50,"investimento":425,"impressions":5000,"cliques":200,"ctr":4.0,"cpc":2.12{"}"}]</div>
            <Field label="" field="daily_data" json />
          </>
        )}

        {editTab === 'anuncios' && (
          <>
            <SectionHeader title="Dados de Anúncios (JSON)" icon="📢" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"name":"Video 1","type":"Video","platform":"meta","investimento":500,"leads":30,"cpl":16.66,"ctr":2.1,"cpm":45,"cpc":3.2,"roas":4.5{"}"}]</div>
            <Field label="" field="ads_data" json />
          </>
        )}

        {editTab === 'origens' && (
          <>
            <SectionHeader title="Origens de Tráfego (JSON)" icon="🔗" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"name":"Instagram Ads","leads":200,"cpl":8,"investimento":1600,"faturamento":8000,"roas":5{"}"}]</div>
            <Field label="" field="origins_data" json />
            <SectionHeader title="Performance por Página (JSON)" icon="📄" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"name":"LP Principal","visits":5000,"leads":300,"conversion":6,"avg_time":"2:30"{"}"}]</div>
            <Field label="" field="pages_data" json />
          </>
        )}

        {editTab === 'pesquisa' && (
          <>
            <SectionHeader title="Dados de Pesquisa (JSON)" icon="📋" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: {"{"}"idade":[{"{"}"label":"25-34","leads":40,"buyers":55{"}"}],"renda":[{"{"}"label":"3-5 SM","leads":35,"buyers":42{"}"}]{"}"}</div>
            <Field label="" field="survey_data" json />
          </>
        )}

        {editTab === 'criativos' && (
          <>
            <SectionHeader title="Criativos Facebook (JSON)" icon="🎨" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"name":"Video Depoimento","type":"Video","temperature":"Quente","investimento":300,"leads":20,"cpl":15,"ctr":3.2,"roas":5{"}"}]</div>
            <Field label="" field="creatives_fb" json />
            <SectionHeader title="Criativos Instagram (JSON)" icon="📸" />
            <Field label="" field="creatives_ig" json />
            <SectionHeader title="Criativos YouTube (JSON)" icon="▶️" />
            <Field label="" field="creatives_yt" json />
          </>
        )}

        {editTab === 'publicos_plat' && (
          <>
            <SectionHeader title="Públicos Facebook (JSON)" icon="👥" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"name":"LAL Compradores 1%","temperature":"Quente","investimento":400,"leads":25,"cpl":16,"ctr":2.8,"roas":4.2{"}"}]</div>
            <Field label="" field="audiences_fb" json />
            <SectionHeader title="Públicos Instagram (JSON)" icon="👥" />
            <Field label="" field="audiences_ig" json />
            <SectionHeader title="Públicos YouTube (JSON)" icon="👥" />
            <Field label="" field="audiences_yt" json />
          </>
        )}

        {editTab === 'semanal' && (
          <>
            <SectionHeader title="Dados Semanais (JSON)" icon="📅" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"week":"Sem 1","investimento":2000,"leads":150,"cpl":13.33,"faturamento":10000,"roas":5,"conversion":3.3{"}"}]</div>
            <Field label="" field="weekly_data" json />
          </>
        )}

        {editTab === 'qualificacao' && (
          <>
            <SectionHeader title="Dados de Qualificação (JSON)" icon="🎯" />
            <div style={{ fontSize: 10, color: T.tx3, marginBottom: 8 }}>Formato: [{"{"}"label":"Renda Extra","value":120,"pct":40,"vendas":15,"conversion":12.5{"}"}]</div>
            <Field label="" field="qualification_data" json />
          </>
        )}

        {editTab === 'temperatura' && (
          <>
            <SectionHeader title="Dados Temperatura Detalhada" icon="🌡️" />
            <FieldRow>
              <Field label="Leads Quentes" field="leads_quentes" />
              <Field label="CPL Quente" field="cpl_quente" />
              <Field label="Invest. Quente" field="invest_quente" />
              <Field label="ROAS Quente" field="roas_quente" />
              <Field label="Fat. Quente" field="fat_quente" />
            </FieldRow>
            <FieldRow>
              <Field label="Leads Frios" field="leads_frios" />
              <Field label="CPL Frio" field="cpl_frio" />
              <Field label="Invest. Frio" field="invest_frio" />
              <Field label="ROAS Frio" field="roas_frio" />
              <Field label="Fat. Frio" field="fat_frio" />
            </FieldRow>
            <SectionHeader title="Públicos por Temperatura (JSON)" icon="👥" />
            <Field label="" field="audiences_data" json />
          </>
        )}
      </div>
    </div>
  );
}
