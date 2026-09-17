'use client';
import { useState, useCallback } from 'react';

const LINK_GROUPS = ['Páginas', 'Pastas e arquivos', 'Dashboards e planilhas', 'Referências'];
const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 16px', marginBottom: 6 };
const btnP = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 8, padding: '7px 14px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnD = { background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: '5px 10px', color: '#ef4444', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

const emptyForm = { group_name: 'Referências', label: '', url: '', description: '', tag: '', visible_to_client: true };

export default function LinksSection({ clientId, links, onReload }: { clientId: string; links: any[]; onReload: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const api = useCallback(async (body: any) => {
    const res = await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  function openAdd() { setEditId(null); setForm({ ...emptyForm }); setShowForm(true); setShowBulk(false); }
  function openEdit(l: any) {
    setEditId(l.id);
    setForm({ group_name: l.group_name, label: l.label, url: l.url, description: l.description || '', tag: l.tag || '', visible_to_client: l.visible_to_client !== false });
    setShowForm(true); setShowBulk(false);
  }

  async function save() {
    if (!form.label.trim() || !form.url.trim()) return;
    setSaving(true);
    const body = editId
      ? { action: 'update_link', link_id: editId, client_id: clientId, ...form, description: form.description || null, tag: form.tag || null }
      : { action: 'add_link', client_id: clientId, ...form, description: form.description || null, tag: form.tag || null };
    const d = await api(body);
    setSaving(false);
    if (d.error) { setMsg(d.error); return; }
    setShowForm(false); setEditId(null);
    setMsg(editId ? 'Link atualizado.' : 'Link adicionado.');
    setTimeout(() => setMsg(''), 2500);
    onReload();
  }

  async function remove(id: string) {
    if (!confirm('Remover este link?')) return;
    await api({ action: 'remove_link', link_id: id, client_id: clientId });
    onReload();
  }

  async function move(id: string, dir: 'up' | 'down') {
    const idx = links.findIndex(l => l.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === links.length - 1) return;
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    const items = links.map((l, i) => {
      if (i === idx) return { id: l.id, sort_order: links[swap].sort_order ?? swap };
      if (i === swap) return { id: l.id, sort_order: links[idx].sort_order ?? idx };
      return null;
    }).filter(Boolean);
    await api({ action: 'reorder_links', items });
    onReload();
  }

  async function bulkAdd() {
    const rows = bulkText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      const parts = line.split('\t');
      return { label: parts[1] || parts[0], url: parts[0], group_name: 'Referências', visible_to_client: true };
    });
    if (!rows.length) return;
    setBulkSaving(true);
    const d = await api({ action: 'bulk_add_links', client_id: clientId, links: rows });
    setBulkSaving(false);
    if (d.error) { setMsg(d.error); return; }
    setBulkText(''); setShowBulk(false);
    setMsg(`${rows.length} links adicionados.`);
    setTimeout(() => setMsg(''), 2500);
    onReload();
  }

  const groups = LINK_GROUPS.filter(g => links.some(l => l.group_name === g))
    .concat(Array.from(new Set(links.map(l => l.group_name))).filter(g => !LINK_GROUPS.includes(g)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <button onClick={openAdd} style={btnP}>+ Adicionar link</button>
        <button onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} style={btnG}>Colar vários</button>
        {msg && <span style={{ fontSize: 12, color: msg.includes('Erro') || msg.includes('error') ? '#ef4444' : '#22c55e' }}>{msg}</span>}
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>{editId ? 'Editar link' : 'Novo link'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={inp} placeholder="Nome *" />
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} style={inp} placeholder="URL *" />
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={inp} placeholder="Descrição" />
            <input value={form.tag} onChange={e => setForm(f => ({ ...f, tag: e.target.value }))} style={inp} placeholder="Tag" />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
            <select value={form.group_name} onChange={e => setForm(f => ({ ...f, group_name: e.target.value }))} style={{ ...inp, width: 200 }}>
              {LINK_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              <input type="checkbox" checked={form.visible_to_client} onChange={e => setForm(f => ({ ...f, visible_to_client: e.target.checked }))} style={{ accentColor: '#a78bfa', width: 14, height: 14 }} />
              Visível para o cliente
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
            <button onClick={() => { setShowForm(false); setEditId(null); }} style={btnG}>Cancelar</button>
          </div>
        </div>
      )}

      {showBulk && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#e2e8f0' }}>Colar vários links</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Uma URL por linha. Formato: URL ou URL[TAB]Nome. Todos vão para o grupo Referências.</p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} style={{ ...inp, minHeight: 100, resize: 'vertical' as const, fontFamily: 'monospace' }} placeholder={'https://exemplo.com\nhttps://outro.com\tNome do link'} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={bulkAdd} disabled={bulkSaving} style={{ ...btnP, opacity: bulkSaving ? 0.7 : 1 }}>{bulkSaving ? 'Adicionando...' : 'Adicionar todos'}</button>
            <button onClick={() => setShowBulk(false)} style={btnG}>Cancelar</button>
          </div>
        </div>
      )}

      {links.length === 0 && !showForm && !showBulk && (
        <div style={{ textAlign: 'center', padding: '32px 24px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: '0 0 12px' }}>Nenhum link cadastrado.</p>
          <button onClick={openAdd} style={btnP}>+ Adicionar link</button>
        </div>
      )}

      {groups.map(group => (
        <div key={group}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>{group}</p>
          {links.filter(l => l.group_name === group).map((link, i, arr) => (
            <div key={link.id} style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                <button onClick={() => move(link.id, 'up')} disabled={i === 0} style={{ ...btnG, padding: '2px 6px', opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => move(link.id, 'down')} disabled={i === arr.length - 1} style={{ ...btnG, padding: '2px 6px', opacity: i === arr.length - 1 ? 0.3 : 1 }}>↓</button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{link.label}</p>
                  {link.tag && <span style={{ fontSize: 10, color: '#a78bfa', background: 'rgba(167,139,250,0.12)', padding: '1px 6px', borderRadius: 6 }}>{link.tag}</span>}
                  {!link.visible_to_client && <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '1px 6px', borderRadius: 6 }}>oculto</span>}
                </div>
                {link.description && <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{link.description}</p>}
                <p style={{ margin: '1px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{link.url}</p>
              </div>
              <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                <button onClick={() => openEdit(link)} style={btnG}>Editar</button>
                <button onClick={() => remove(link.id)} style={btnD}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
