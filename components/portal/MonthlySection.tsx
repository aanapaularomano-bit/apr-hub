'use client';
import { useState, useEffect, useCallback } from 'react';

const METRICS = [
  { key: 'investimento', label: 'Investimento (R$)' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL (R$)' },
  { key: 'vendas', label: 'Vendas' },
];

const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
const btnP = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 9, padding: '8px 16px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 12, fontWeight: 600 as const, fontFamily: 'inherit' };
const btnG = { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 14px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' as const, fontSize: 12, fontFamily: 'inherit' };

function currentMonthKey() { return new Date().toISOString().slice(0, 7); }
function fmtMonth(mk?: string | null) {
  if (!mk) return '—';
  const [y, m] = mk.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]}/${y}`;
}

export default function MonthlySection({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [selMonth, setSelMonth] = useState(currentMonthKey());
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [highlights, setHighlights] = useState('');
  const [note, setNote] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const api = useCallback(async (body: any) => {
    const res = await fetch('/api/portal/manage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }, []);

  const loadList = useCallback(async () => {
    const d = await fetch(`/api/portal/manage?client_id=${clientId}&section=monthly`).then(r => r.json());
    setReports(d.reports || []);
  }, [clientId]);

  const loadReport = useCallback(async (month_key: string) => {
    setLoading(true);
    const d = await fetch(`/api/portal/manage?client_id=${clientId}&section=monthly&month_key=${month_key}`).then(r => r.json());
    const r = d.report;
    setReport(r ?? null);
    setMetrics(r?.metrics ? Object.fromEntries(Object.entries(r.metrics).map(([k, v]) => [k, v != null ? String(v) : ''])) : {});
    setHighlights(r?.highlights || '');
    setNote(r?.note || '');
    setPublished(r?.published || false);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadReport(selMonth); }, [selMonth, loadReport]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2500); }

  async function save() {
    setSaving(true);
    const numMetrics: Record<string, number | null> = {};
    for (const f of METRICS) {
      const v = metrics[f.key];
      numMetrics[f.key] = v !== '' && v !== undefined ? parseFloat(v) : null;
    }
    const d = await api({ action: 'upsert_monthly_report', client_id: clientId, month_key: selMonth, metrics: numMetrics, highlights: highlights || null, note: note || null, published });
    setSaving(false);
    if (d.error) { flash(d.error); return; }
    setReport(d.report);
    flash('Salvo.');
    loadList();
  }

  async function togglePublish() {
    const newPub = !published;
    if (!report) { setPublished(newPub); await save(); return; }
    setPublished(newPub);
    await api({ action: 'publish_monthly_report', report_id: report.id, client_id: clientId, published: newPub });
    flash(newPub ? 'Publicado.' : 'Despublicado.');
    loadList();
  }

  async function duplicatePrev() {
    const d = await api({ action: 'duplicate_monthly_report', client_id: clientId, target_month_key: selMonth });
    if (d.source) {
      const src = d.source;
      setMetrics(src.metrics ? Object.fromEntries(Object.entries(src.metrics).map(([k, v]) => [k, v != null ? String(v) : ''])) : {});
      setHighlights(src.highlights || '');
      setNote(src.note || '');
      setPublished(false);
      flash(`Dados copiados de ${fmtMonth(src.month_key)}. Salve para confirmar.`);
    } else {
      flash('Nenhum relatório anterior encontrado.');
    }
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Month list */}
      <div style={{ width: 150, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Meses</span>
          <button onClick={() => setSelMonth(currentMonthKey())} style={{ ...btnG, padding: '3px 8px', fontSize: 11 }}>Atual</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)} style={{ ...inp, fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 360, overflowY: 'auto' as const }}>
          {reports.map(r => (
            <button key={r.month_key} onClick={() => setSelMonth(r.month_key)}
              style={{ background: selMonth === r.month_key ? 'rgba(167,139,250,0.12)' : 'transparent', border: selMonth === r.month_key ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ fontSize: 12, color: selMonth === r.month_key ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>{fmtMonth(r.month_key)}</span>
              {r.published && <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: '#22c55e15', borderRadius: 4, padding: '1px 5px' }}>PUB</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{fmtMonth(selMonth)}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
                {msg && <span style={{ fontSize: 12, color: msg.includes('Nenhum') ? '#f59e0b' : '#22c55e' }}>{msg}</span>}
                <button onClick={duplicatePrev} style={btnG}>Duplicar anterior</button>
                <button onClick={togglePublish}
                  style={{ background: published ? '#22c55e20' : 'rgba(255,255,255,0.05)', border: `1px solid ${published ? '#22c55e40' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '6px 14px', color: published ? '#22c55e' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  {published ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={save} disabled={saving} style={{ ...btnP, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Métricas</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {METRICS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input type="number" value={metrics[f.key] ?? ''} onChange={e => setMetrics(m => ({ ...m, [f.key]: e.target.value }))} style={inp} placeholder="—" />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destaques do mês</p>
              <textarea value={highlights} onChange={e => setHighlights(e.target.value)}
                style={{ ...inp, resize: 'vertical' as const, minHeight: 80, fontFamily: 'inherit' }}
                placeholder="Principais conquistas, campanhas e marcos do mês..." rows={3} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Observação</p>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                style={{ ...inp, resize: 'vertical' as const, minHeight: 80, fontFamily: 'inherit' }}
                placeholder="Contexto, observações para o cliente..." rows={3} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
