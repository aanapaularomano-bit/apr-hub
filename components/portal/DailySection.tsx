'use client';

import { useState, useEffect, useCallback } from 'react';

const METRIC_FIELDS = [
  { key: 'investimento', label: 'Investimento (R$)' },
  { key: 'leads', label: 'Leads' },
  { key: 'cpl', label: 'CPL (R$)' },
  { key: 'vendas', label: 'Vendas' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d?: string | null) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export default function DailySection({ clientId }: { clientId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [selDate, setSelDate] = useState(today());
  const [report, setReport] = useState<any>(null);
  const [metrics, setMetrics] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const inp = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 11px', color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const };
  const cardS = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 18px' };
  const btnPrimary = { background: '#a78bfa20', border: '1px solid #a78bfa40', borderRadius: 9, padding: '8px 16px', color: '#a78bfa', cursor: 'pointer' as const, fontSize: 13, fontWeight: 600 as const, fontFamily: 'inherit' };

  const loadList = useCallback(async () => {
    const res = await fetch(`/api/portal/manage?client_id=${clientId}&section=daily`);
    const data = await res.json();
    setReports(data.reports || []);
  }, [clientId]);

  const loadReport = useCallback(async (date: string) => {
    setLoading(true);
    const res = await fetch(`/api/portal/manage?client_id=${clientId}&section=daily&date=${date}`);
    const data = await res.json();
    const r = data.report;
    setReport(r || null);
    setMetrics(r?.metrics || {});
    setNote(r?.note || '');
    setPublished(r?.published || false);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadReport(selDate); }, [selDate, loadReport]);

  async function save() {
    setSaving(true);
    const numMetrics: Record<string, number | null> = {};
    for (const f of METRIC_FIELDS) {
      const v = metrics[f.key];
      numMetrics[f.key] = v !== '' && v !== undefined ? parseFloat(v) : null;
    }
    const res = await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert_daily_report', client_id: clientId, date: selDate, metrics: numMetrics, note: note || null, published }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.report) { setReport(data.report); loadList(); }
  }

  async function togglePublish() {
    if (!report) { await save(); return; }
    const newPub = !published;
    setPublished(newPub);
    await fetch('/api/portal/manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish_daily_report', report_id: report.id, published: newPub }),
    });
    loadList();
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      {/* Date list */}
      <div style={{ width: 160, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Relatórios</span>
          <button onClick={() => setSelDate(today())} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, padding: '3px 8px', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Hoje</button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)} style={{ ...inp, fontSize: 12 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 380, overflowY: 'auto' as const }}>
          {reports.map(r => (
            <button key={r.date} onClick={() => setSelDate(r.date)} style={{ background: selDate === r.date ? 'rgba(167,139,250,0.12)' : 'transparent', border: selDate === r.date ? '1px solid rgba(167,139,250,0.25)' : '1px solid transparent', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', textAlign: 'left' as const, fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <span style={{ fontSize: 12, color: selDate === r.date ? '#a5b4fc' : 'rgba(255,255,255,0.5)' }}>{formatDate(r.date)}</span>
              {r.published && <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', background: '#22c55e15', borderRadius: 4, padding: '1px 5px' }}>PUB</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Report editor */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Carregando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{formatDate(selDate)}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: published ? '#22c55e' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                  {published ? 'Publicado' : 'Rascunho'}
                </span>
                <button onClick={togglePublish} style={{ background: published ? '#22c55e20' : 'rgba(255,255,255,0.05)', border: `1px solid ${published ? '#22c55e40' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, padding: '6px 14px', color: published ? '#22c55e' : 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  {published ? 'Despublicar' : 'Publicar'}
                </button>
                <button onClick={save} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>

            {/* Metrics */}
            <div style={cardS}>
              <p style={{ margin: '0 0 12px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Métricas</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {METRIC_FIELDS.map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type="number"
                      value={metrics[f.key] ?? ''}
                      onChange={e => setMetrics(m => ({ ...m, [f.key]: e.target.value }))}
                      style={inp}
                      placeholder="—"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div style={cardS}>
              <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Observação</p>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                style={{ ...inp, resize: 'vertical' as const, minHeight: 80 }}
                placeholder="Contexto do dia, destaques, observações para o cliente..."
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
