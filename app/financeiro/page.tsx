'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
// Acesso via API server-side (/api/financeiro)

/* ============================================
   APR FINANCEIRO — Next.js + Supabase
   Rota: /financeiro
   ============================================ */

// Supabase acessado apenas no servidor

const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function makeEmptyMonth() {
  return {
    'rec-pj': [
      { cliente: 'Renata Cappai (PEDS)', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Renata Bacha (CBDS)', squad: 'Perpétuo', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Babi Rezende (Yoga)', squad: 'Lançamentos', tipo: 'Projeto', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Franciele Maftum (PNP)', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      { cliente: 'Bruna Araújo (C2PRO)', squad: 'Perpétuo', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
    ],
    'cust-pj': [
      { desc: 'Salário/Pró-labore', cat: 'Equipe', venc: '05', valor: 0, pago: false },
      { desc: 'Freelas / Squad', cat: 'Equipe', venc: '10', valor: 0, pago: false },
      { desc: 'Ferramentas (Meta, ManyChat, AC, etc)', cat: 'Ferramentas', venc: '15', valor: 0, pago: false },
      { desc: 'Contador', cat: 'Administrativo', venc: '05', valor: 0, pago: false },
      { desc: 'Impostos (Simples)', cat: 'Impostos', venc: '20', valor: 0, pago: false },
      { desc: 'Hospedagem/Vercel/Supabase', cat: 'Infra', venc: '05', valor: 0, pago: false },
    ],
    'var-pj': [],
    'rec-pf': [
      { origem: 'Pró-labore (da PJ)', tipo: 'Salário', data: '05', valor: 0, recebido: false },
    ],
    'cust-pf': [
      { desc: 'Aluguel / Financiamento', cat: 'Moradia', venc: '10', valor: 0, pago: false },
      { desc: 'Mercado', cat: 'Alimentação', venc: '15', valor: 0, pago: false },
      { desc: 'Energia/Água/Internet', cat: 'Utilidades', venc: '15', valor: 0, pago: false },
      { desc: 'Plano de saúde', cat: 'Saúde', venc: '10', valor: 0, pago: false },
      { desc: 'Academia/Esporte', cat: 'Bem-estar', venc: '05', valor: 0, pago: false },
    ],
    'var-pf': [],
    'cards': [
      { nome: 'Nubank', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '10' },
      { nome: 'Inter PJ', bandeira: 'Mastercard', titular: 'PJ', limite: 0, fatura: 0, venc: '15' },
    ],
    'card-tx': [],
    'metas': [
      { meta: 'Reserva de emergência', cat: 'Reserva', alvo: 0, real: 0 },
      { meta: 'Investimentos do mês', cat: 'Investimento', alvo: 0, real: 0 },
      { meta: 'Faturamento PJ', cat: 'Faturamento', alvo: 0, real: 0 },
    ],
    'reserva': [
      { desc: 'Reserva de emergência', tipo: 'CDB liquidez diária', saldo: 0, aporte: 0 },
      { desc: 'Investimentos LP', tipo: 'Tesouro/CDI', saldo: 0, aporte: 0 },
    ],
    notes: ''
  };
}

function getInitialMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function fmtBR(n: number) {
  if (typeof n !== 'number' || isNaN(n)) n = 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}
function fmtPct(n: number) { return (Math.round(n * 10) / 10).toFixed(1) + '%'; }

export default function FinanceiroPage() {
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  const [db, setDb] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('Carregando...');
  const [activeTab, setActiveTab] = useState('resumo');
  const saveTimerRef = useRef<any>(null);

  // CARREGAR dados do Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch('/api/financeiro');
      const json = await res.json();
      if (json.error) {
        console.error(json.error);
        setSaveStatus('Erro ao carregar');
      } else {
        const newDb: Record<string, any> = {};
        (json.data || []).forEach((row: any) => {
          newDb[row.month_key] = row.data;
        });
        setDb(newDb);
        setSaveStatus('Carregado da nuvem ✓');
      }
      setLoading(false);
    })();
  }, []);

  // SALVAR no Supabase (debounced)
  const saveMonth = useCallback(async (monthKey: string, monthData: any) => {
    setSaveStatus('Salvando...');
    const res = await fetch('/api/financeiro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month_key: monthKey, data: monthData }),
    });
    const json = await res.json();
    if (json.error) {
      console.error(json.error);
      setSaveStatus('Erro ao salvar');
    } else {
      setSaveStatus('Salvo na nuvem ✓');
      setTimeout(() => setSaveStatus('Sincronizado'), 2000);
    }
  }, []);

  const updateMonth = useCallback((updater: (m: any) => any) => {
    setDb(prev => {
      const current = prev[currentMonth] || makeEmptyMonth();
      const updated = updater(JSON.parse(JSON.stringify(current)));
      const newDb = { ...prev, [currentMonth]: updated };
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveMonth(currentMonth, updated), 600);
      return newDb;
    });
  }, [currentMonth, saveMonth]);

  const copyPreviousMonth = () => {
    const [y, mo] = currentMonth.split('-').map(Number);
    const prevDate = new Date(y, mo - 2, 1);
    const prevKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevData = db[prevKey];
    if (!prevData) {
      alert('Nenhum dado encontrado no mês anterior para copiar.');
      return;
    }
    if (!confirm(`Copiar dados de \${MESES_NOMES[prevDate.getMonth()]} / \${prevDate.getFullYear()} para o mês atual? Isso substituirá os dados atuais.`)) return;
    const copied = JSON.parse(JSON.stringify(prevData));
    // Reseta campos de status (recebido/pago) para o novo mês
    (copied['rec-pj'] || []).forEach((r: any) => { r.recebido = false; });
    (copied['rec-pf'] || []).forEach((r: any) => { r.recebido = false; });
    (copied['cust-pj'] || []).forEach((r: any) => { r.pago = false; });
    (copied['cust-pf'] || []).forEach((r: any) => { r.pago = false; });
    copied.notes = '';
    setDb(prev => {
      const newDb = { ...prev, [currentMonth]: copied };
      saveMonth(currentMonth, copied);
      return newDb;
    });
  };



  const m = db[currentMonth] || makeEmptyMonth();

  // ===== CÁLCULOS =====
  const sumValor = (arr: any[]) => (arr || []).reduce((s, r) => s + (parseFloat(r.valor) || 0), 0);
  const recPJ = sumValor(m['rec-pj']);
  const recPF = sumValor(m['rec-pf']);
  const custPJ = sumValor(m['cust-pj']) + sumValor(m['var-pj']);
  const custPF = sumValor(m['cust-pf']) + sumValor(m['var-pf']);
  const cardsFatura = (m['cards'] || []).reduce((s: number, r: any) => s + (parseFloat(r.fatura) || 0), 0);
  const recPJReceived = (m['rec-pj'] || []).reduce((s: number, r: any) => s + (r.recebido ? (parseFloat(r.valor) || 0) : 0), 0);
  const recTotal = recPJ + recPF;
  const custTotal = custPJ + custPF;
  const resultado = recTotal - custTotal;
  const margem = recTotal > 0 ? (resultado / recTotal) * 100 : 0;

  // ===== HELPERS =====
  const updRow = (key: string, idx: number, field: string, value: any) => {
    updateMonth(month => {
      if (!month[key]) month[key] = [];
      month[key][idx][field] = value;
      return month;
    });
  };
  const delRow = (key: string, idx: number) => {
    if (!confirm('Remover este item?')) return;
    updateMonth(month => {
      month[key].splice(idx, 1);
      return month;
    });
  };
  const addRow = (key: string) => {
    const templates: any = {
      'rec-pj': { cliente: '', squad: 'Lançamentos', tipo: 'Recorrente', status: 'Ativo', dia: '', valor: 0, recebido: false },
      'cust-pj': { desc: '', cat: 'Ferramentas', venc: '', valor: 0, pago: false },
      'var-pj': { desc: '', cliente: '', data: '', valor: 0 },
      'rec-pf': { origem: '', tipo: 'Salário', data: '', valor: 0, recebido: false },
      'cust-pf': { desc: '', cat: 'Moradia', venc: '', valor: 0, pago: false },
      'var-pf': { desc: '', cat: 'Lazer', data: '', valor: 0 },
      'cards': { nome: '', bandeira: 'Mastercard', titular: 'PF', limite: 0, fatura: 0, venc: '' },
      'card-tx': { data: '', desc: '', cartao: '', cat: 'Outros', origem: 'PF', valor: 0, parcelas: '1x' },
      'metas': { meta: '', cat: 'Faturamento', alvo: 0, real: 0 },
      'reserva': { desc: '', tipo: '', saldo: 0, aporte: 0 },
    };
    updateMonth(month => {
      if (!month[key]) month[key] = [];
      month[key].push({ ...templates[key] });
      return month;
    });
  };

  const monthOptions = (() => {
    const d = new Date();
    const arr = [];
    for (let i = -6; i <= 12; i++) {
      const dt = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      arr.push({ key, label: `${MESES_NOMES[dt.getMonth()]} / ${dt.getFullYear()}` });
    }
    return arr;
  })();

  const [yy, mm] = currentMonth.split('-');
  const currentMonthLabel = `${MESES_NOMES[+mm - 1]} / ${yy}`;

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0d', color: '#e9e9f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>Carregando APR Financeiro...</div>;
  }

  return (
    <div className="apr-fin">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600;9..144,700&family=JetBrains+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .apr-fin {
          --bg-0:#0a0a0d; --bg-1:#101015; --bg-2:#161620; --bg-3:#1d1d2a;
          --line:#2a2a3a; --line-soft:#1e1e2b; --text:#e9e9f2; --text-soft:#9b9bb0; --text-dim:#6a6a80;
          --accent:#c8ff5a; --accent-2:#7afcb8; --warn:#ffb454; --danger:#ff6b8a; --info:#7cb7ff;
          --r-sm:8px; --r-md:12px; --r-lg:18px;
          font-family:'Inter',sans-serif; background:var(--bg-0); color:var(--text); min-height:100vh;
          line-height:1.5;
          background-image:radial-gradient(circle at 15% 10%, rgba(200,255,90,.04), transparent 40%), radial-gradient(circle at 85% 90%, rgba(122,252,184,.03), transparent 50%);
        }
        .apr-fin *{box-sizing:border-box}
        .apr-fin header{padding:28px 40px 20px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;background:rgba(10,10,13,.85);backdrop-filter:blur(12px);position:sticky;top:0;z-index:100}
        .apr-fin .brand{display:flex;align-items:center;gap:14px}
        .apr-fin .brand-mark{width:42px;height:42px;border-radius:10px;background:linear-gradient(135deg,var(--accent) 0%,var(--accent-2) 100%);display:flex;align-items:center;justify-content:center;color:#0a0a0d;font-weight:700;font-size:18px;font-family:'Fraunces',serif;box-shadow:0 0 30px rgba(200,255,90,.25)}
        .apr-fin .brand-text h1{font-family:'Fraunces',serif;font-weight:600;font-size:22px;letter-spacing:-.02em;margin:0}
        .apr-fin .brand-text .sub{font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.15em;font-family:'JetBrains Mono',monospace}
        .apr-fin .month-picker{display:flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:8px 12px;font-family:'JetBrains Mono',monospace;font-size:13px}
        .apr-fin .month-picker select{background:transparent;border:none;color:var(--text);font-family:inherit;font-size:13px;cursor:pointer;outline:none}
        .apr-fin .month-picker select option{background:var(--bg-2)}
        .apr-fin .btn{padding:9px 16px;border-radius:var(--r-sm);font-size:13px;font-weight:500;border:1px solid var(--line);background:var(--bg-2);color:var(--text);cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px}
        .apr-fin .btn:hover{background:var(--bg-3);border-color:var(--text-dim)}
        .apr-fin .btn-primary{background:var(--accent);color:#0a0a0d;border-color:var(--accent);font-weight:600}
        .apr-fin .tabs{display:flex;gap:4px;padding:0 40px;border-bottom:1px solid var(--line);background:var(--bg-1);overflow-x:auto}
        .apr-fin .tab{padding:14px 18px;background:transparent;border:none;color:var(--text-soft);font-family:inherit;font-size:13px;font-weight:500;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;display:flex;align-items:center;gap:8px}
        .apr-fin .tab:hover{color:var(--text)}
        .apr-fin .tab.active{color:var(--accent);border-bottom-color:var(--accent)}
        .apr-fin .tab-dot{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.6}
        .apr-fin main{padding:32px 40px 80px;max-width:1600px;margin:0 auto}
        .apr-fin .section-title{font-family:'Fraunces',serif;font-size:28px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}
        .apr-fin .section-sub{color:var(--text-dim);font-size:14px;margin-bottom:28px}
        .apr-fin .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:32px}
        .apr-fin .kpi{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r-md);padding:20px;position:relative;overflow:hidden}
        .apr-fin .kpi::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;background:var(--accent);opacity:.7}
        .apr-fin .kpi.pf::before{background:var(--accent-2)}
        .apr-fin .kpi.warn::before{background:var(--warn)}
        .apr-fin .kpi.danger::before{background:var(--danger)}
        .apr-fin .kpi-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--text-dim);font-weight:500;margin-bottom:8px;font-family:'JetBrains Mono',monospace}
        .apr-fin .kpi-value{font-family:'Fraunces',serif;font-size:30px;font-weight:600;letter-spacing:-.02em;line-height:1.1}
        .apr-fin .kpi-value.neg{color:var(--danger)}
        .apr-fin .kpi-value.pos{color:var(--accent)}
        .apr-fin .kpi-meta{font-size:12px;color:var(--text-dim);margin-top:8px}
        .apr-fin .block{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r-lg);margin-bottom:24px;overflow:hidden}
        .apr-fin .block-head{padding:20px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line-soft);flex-wrap:wrap;gap:12px}
        .apr-fin .block-title{font-family:'Fraunces',serif;font-size:18px;font-weight:600;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
        .apr-fin .badge{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:.1em;padding:3px 8px;border-radius:4px;background:var(--bg-3);color:var(--text-soft)}
        .apr-fin .badge.pj{background:rgba(200,255,90,.12);color:var(--accent)}
        .apr-fin .badge.pf{background:rgba(122,252,184,.12);color:var(--accent-2)}
        .apr-fin .block-body{padding:20px 24px}
        .apr-fin table{width:100%;border-collapse:collapse;font-size:13px}
        .apr-fin th{text-align:left;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);padding:10px 8px;border-bottom:1px solid var(--line);font-family:'JetBrains Mono',monospace}
        .apr-fin td{padding:10px 8px;border-bottom:1px solid var(--line-soft)}
        .apr-fin tr:last-child td{border-bottom:none}
        .apr-fin tr.total td{border-top:2px solid var(--line);font-weight:600;color:var(--accent);padding-top:14px;font-family:'JetBrains Mono',monospace}
        .apr-fin td input, .apr-fin td select{background:transparent;border:1px solid transparent;color:var(--text);padding:6px 8px;border-radius:6px;font-family:inherit;font-size:13px;width:100%}
        .apr-fin td input:hover, .apr-fin td select:hover{border-color:var(--line)}
        .apr-fin td input:focus, .apr-fin td select:focus{border-color:var(--accent);outline:none;background:var(--bg-2)}
        .apr-fin td input[type=number]{text-align:right;font-family:'JetBrains Mono',monospace}
        .apr-fin td.right{text-align:right;font-family:'JetBrains Mono',monospace}
        .apr-fin td select option{background:var(--bg-2)}
        .apr-fin .btn-del{background:transparent;border:none;color:var(--text-dim);cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px}
        .apr-fin .btn-del:hover{color:var(--danger);background:rgba(255,107,138,.08)}
        .apr-fin .add-row{display:flex;gap:8px;align-items:center;margin-top:14px;padding-top:14px;border-top:1px dashed var(--line)}
        .apr-fin .add-row .btn{font-size:12px;padding:7px 12px}
        .apr-fin .two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
        @media(max-width:1024px){.apr-fin .two-col{grid-template-columns:1fr}}
        .apr-fin .alerts{display:flex;flex-direction:column;gap:10px}
        .apr-fin .alert{padding:14px 18px;border-radius:var(--r-md);border-left:3px solid;display:flex;gap:12px;align-items:flex-start;background:var(--bg-2);font-size:13px}
        .apr-fin .alert.warn{border-color:var(--warn);background:rgba(255,180,84,.06)}
        .apr-fin .alert.danger{border-color:var(--danger);background:rgba(255,107,138,.06)}
        .apr-fin .alert.ok{border-color:var(--accent);background:rgba(200,255,90,.05)}
        .apr-fin .alert.info{border-color:var(--info);background:rgba(124,183,255,.05)}
        .apr-fin .alert-icon{font-size:18px;line-height:1}
        .apr-fin .alert-body strong{display:block;margin-bottom:2px;font-size:13px}
        .apr-fin .alert-body span{color:var(--text-soft);font-size:12px}
        .apr-fin .progress{width:100%;height:8px;background:var(--bg-3);border-radius:4px;overflow:hidden;margin-top:6px}
        .apr-fin .progress-bar{height:100%;background:var(--accent);border-radius:4px;transition:width .4s}
        .apr-fin .progress-bar.warn{background:var(--warn)}
        .apr-fin .progress-bar.danger{background:var(--danger)}
        .apr-fin .meta-bar{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--bg-2);border-radius:var(--r-sm);font-size:12px;color:var(--text-dim);font-family:'JetBrains Mono',monospace;margin-bottom:20px}
        .apr-fin .save-status{display:flex;align-items:center;gap:6px}
        .apr-fin .save-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:aprpulse 2s infinite}
        @keyframes aprpulse{0%,100%{opacity:1}50%{opacity:.4}}
        .apr-fin .cards-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
        .apr-fin .card-tile{background:linear-gradient(135deg,var(--bg-2) 0%,var(--bg-3) 100%);border:1px solid var(--line);border-radius:var(--r-md);padding:18px;position:relative;overflow:hidden}
        .apr-fin .card-name{font-family:'Fraunces',serif;font-size:16px;font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
        .apr-fin .card-flag{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);font-family:'JetBrains Mono',monospace}
        .apr-fin .card-row{display:flex;justify-content:space-between;font-size:13px;margin:6px 0}
        .apr-fin .card-row .lbl{color:var(--text-soft);font-size:12px}
        .apr-fin .card-row .val{font-family:'JetBrains Mono',monospace}
        .apr-fin .dre-row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--line-soft);font-size:14px}
        .apr-fin .dre-row.h{font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--text-dim);font-weight:500;padding:14px 0 8px;border-bottom:1px solid var(--line)}
        .apr-fin .dre-row.total{font-family:'Fraunces',serif;font-size:18px;font-weight:600;color:var(--accent);padding:14px 0;border-top:2px solid var(--line);border-bottom:none}
        .apr-fin .dre-row .v{font-family:'JetBrains Mono',monospace}
        .apr-fin .dre-row.neg .v{color:var(--danger)}
        .apr-fin .dre-row.indent{padding-left:20px;color:var(--text-soft);font-size:13px}
        .apr-fin .scenarios{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px}
        @media(max-width:900px){.apr-fin .scenarios{grid-template-columns:1fr}}
        .apr-fin .scenario{background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-md);padding:18px}
        .apr-fin .scenario h4{font-family:'Fraunces',serif;font-size:15px;font-weight:600;margin:0 0 8px;display:flex;justify-content:space-between;align-items:center}
        .apr-fin .scenario .big{font-family:'Fraunces',serif;font-size:24px;font-weight:600;margin:10px 0 4px}
        .apr-fin .scenario .small{font-size:12px;color:var(--text-dim);margin-bottom:10px}
        .apr-fin .scenario.pessimist .big{color:var(--danger)}
        .apr-fin .scenario.realist .big{color:var(--accent)}
        .apr-fin .scenario.optimist .big{color:var(--accent-2)}
        .apr-fin .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
        .apr-fin .form-grid input{background:var(--bg-2);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:6px;font-family:inherit;font-size:13px}
        .apr-fin .empty{text-align:center;padding:40px 20px;color:var(--text-dim);font-size:13px;background:var(--bg-2);border-radius:var(--r-md);border:1px dashed var(--line)}
        @media(max-width:768px){
          .apr-fin header{padding:20px 20px 16px}
          .apr-fin main{padding:20px 16px 60px}
          .apr-fin .tabs{padding:0 16px}
          .apr-fin .tab{padding:12px 12px;font-size:12px}
          .apr-fin .section-title{font-size:22px}
          .apr-fin table{font-size:12px}
          .apr-fin th, .apr-fin td{padding:8px 6px}
        }
      `}</style>

      <header>
        <div className="brand">
          <div className="brand-mark">$</div>
          <div className="brand-text">
            <h1>APR Financeiro</h1>
            <div className="sub">Planejamento Mensal · PJ + PF</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="month-picker">
            <span>📅</span>
            <select value={currentMonth} onChange={e => setCurrentMonth(e.target.value)}>
              {monthOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <button className="btn" onClick={copyPreviousMonth}>📋 Copiar mês anterior</button>
          <a href="/" className="btn">← Voltar ao Hub</a>
        </div>
      </header>

      <nav className="tabs">
        {[
          ['resumo', 'Resumo'],
          ['pj', 'PJ · APR Digital'],
          ['pf', 'PF · Pessoal'],
          ['cartoes', 'Cartões'],
          ['fluxo', 'Fluxo de Caixa'],
          ['metas', 'Metas'],
          ['dre', 'DRE'],
          ['cenarios', 'Cenários'],
        ].map(([id, label]) => (
          <button key={id} className={`tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>
            <span className="tab-dot"></span>{label}
          </button>
        ))}
      </nav>

      <main>
        <div className="meta-bar">
          <div className="save-status">
            <span className="save-dot"></span>
            <span>{saveStatus}</span>
          </div>
          <div>{currentMonthLabel}</div>
        </div>

        {/* RESUMO */}
        {activeTab === 'resumo' && (
          <section>
            <h2 className="section-title">Resumo Executivo</h2>
            <p className="section-sub">Visão consolidada PJ + PF do mês selecionado</p>
            <div className="kpi-grid">
              <div className="kpi"><div className="kpi-label">Receita PJ</div><div className="kpi-value pos">{fmtBR(recPJ)}</div><div className="kpi-meta">{(m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo').length} clientes ativos</div></div>
              <div className="kpi pf"><div className="kpi-label">Receita PF</div><div className="kpi-value pos">{fmtBR(recPF)}</div><div className="kpi-meta">renda pessoal</div></div>
              <div className="kpi danger"><div className="kpi-label">Despesas Totais</div><div className="kpi-value neg">{fmtBR(custTotal)}</div><div className="kpi-meta">PJ {fmtBR(custPJ)} · PF {fmtBR(custPF)}</div></div>
              <div className="kpi"><div className="kpi-label">Resultado Líquido</div><div className={`kpi-value ${resultado >= 0 ? 'pos' : 'neg'}`}>{fmtBR(resultado)}</div><div className="kpi-meta">{resultado >= 0 ? 'sobra do mês' : 'déficit do mês'}</div></div>
              <div className="kpi warn"><div className="kpi-label">Fatura Cartões</div><div className="kpi-value">{fmtBR(cardsFatura)}</div><div className="kpi-meta">{(m['cards'] || []).length} cartões</div></div>
              <div className="kpi"><div className="kpi-label">Margem</div><div className="kpi-value">{fmtPct(margem)}</div><div className="kpi-meta">resultado / receita</div></div>
            </div>

            <div className="two-col">
              <div className="block">
                <div className="block-head"><div className="block-title">⚠ Alertas e Insights</div></div>
                <div className="block-body">
                  <div className="alerts">
                    {(() => {
                      const a: any[] = [];
                      if (resultado < 0) a.push({ type: 'danger', icon: '⛔', title: 'Mês no negativo', msg: `Resultado de ${fmtBR(resultado)}. Revise custos ou acelere recebimentos.` });
                      if (recPJ > 0 && custPJ / recPJ > 0.7) a.push({ type: 'warn', icon: '⚠', title: 'Custo fixo PJ alto', msg: `Custos PJ representam ${fmtPct((custPJ / recPJ) * 100)} da receita PJ. Ideal abaixo de 60%.` });
                      if (recPJ > 0 && recPJReceived / recPJ < 0.5) a.push({ type: 'warn', icon: '💸', title: 'Recebimentos atrasados', msg: `Apenas ${fmtPct((recPJReceived / recPJ) * 100)} da receita PJ foi efetivamente recebida.` });
                      const cardWarn = (m['cards'] || []).filter((c: any) => c.limite > 0 && (c.fatura / c.limite) > 0.8);
                      if (cardWarn.length) a.push({ type: 'warn', icon: '💳', title: 'Cartões próximos do limite', msg: `${cardWarn.length} cartão(ões) usando mais de 80% do limite.` });
                      if (resultado > 0 && recTotal > 0 && (resultado / recTotal) >= 0.3) a.push({ type: 'ok', icon: '✨', title: 'Excelente margem', msg: `Margem de ${fmtPct((resultado / recTotal) * 100)}. Direcione parte para reserva.` });
                      if (!a.length) a.push({ type: 'info', icon: 'ℹ', title: 'Nenhum alerta no momento', msg: 'Preencha os dados do mês para receber insights.' });
                      return a.map((x, i) => (
                        <div key={i} className={`alert ${x.type}`}>
                          <div className="alert-icon">{x.icon}</div>
                          <div className="alert-body"><strong>{x.title}</strong><span>{x.msg}</span></div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              <div className="block">
                <div className="block-head"><div className="block-title">📊 Distribuição do mês</div></div>
                <div className="block-body">
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10, fontFamily: 'JetBrains Mono,monospace' }}>Receitas</div>
                  {[{ l: 'PJ', v: recPJ, c: 'var(--accent)' }, { l: 'PF', v: recPF, c: 'var(--accent-2)' }].map((d, i) => {
                    const pct = recTotal > 0 ? (d.v / recTotal) * 100 : 0;
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>Receita {d.l}</span><span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(d.v)} · {fmtPct(pct)}</span></div>
                        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: d.c }}></div></div>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em', margin: '18px 0 10px', fontFamily: 'JetBrains Mono,monospace' }}>Despesas</div>
                  {[{ l: 'PJ', v: custPJ, c: 'var(--warn)' }, { l: 'PF', v: custPF, c: 'var(--danger)' }].map((d, i) => {
                    const pct = custTotal > 0 ? (d.v / custTotal) * 100 : 0;
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}><span>Custos {d.l}</span><span style={{ fontFamily: 'JetBrains Mono,monospace' }}>{fmtBR(d.v)} · {fmtPct(pct)}</span></div>
                        <div className="progress"><div className="progress-bar" style={{ width: `${pct}%`, background: d.c }}></div></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* GRÁFICOS */}
            <div className="two-col">
              {/* Concentração de receita por cliente */}
              <div className="block">
                <div className="block-head"><div className="block-title">🎯 Concentração de Receita</div></div>
                <div className="block-body">
                  {(() => {
                    const clientes = (m['rec-pj'] || []).filter((r: any) => r.valor > 0 && r.status === 'Ativo');
                    if (!clientes.length) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Preencha os valores dos clientes pra ver a concentração.</div>;
                    const total = clientes.reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const sorted = [...clientes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
                    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--info)', 'var(--warn)', '#c084fc', '#f472b6', '#67e8f9', '#fbbf24'];
                    return (
                      <div>
                        {/* Barra horizontal empilhada */}
                        <div style={{display:'flex',height:32,borderRadius:8,overflow:'hidden',marginBottom:16}}>
                          {sorted.map((cl: any, idx: number) => {
                            const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                            return <div key={idx} style={{width:pct+'%',background:colors[idx % colors.length],minWidth:pct>3?'auto':'2px',position:'relative',cursor:'pointer'}} title={cl.cliente+': '+pct.toFixed(1)+'%'}></div>;
                          })}
                        </div>
                        {/* Legenda */}
                        {sorted.map((cl: any, idx: number) => {
                          const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                          const isRisk = pct > 30;
                          return (
                            <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--line-soft)',fontSize:13}}>
                              <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <span style={{width:10,height:10,borderRadius:2,background:colors[idx % colors.length],display:'inline-block'}}></span>
                                <span>{cl.cliente}</span>
                              </div>
                              <div style={{fontFamily:'JetBrains Mono,monospace',display:'flex',gap:12,alignItems:'center'}}>
                                <span>{fmtBR(cl.valor)}</span>
                                <span style={{color: isRisk ? 'var(--danger)' : 'var(--text-dim)',fontWeight: isRisk ? 600 : 400}}>
                                  {pct.toFixed(1)}% {isRisk ? '⚠' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {sorted.some((cl: any) => total > 0 && (cl.valor / total) * 100 > 30) && (
                          <div style={{marginTop:12,padding:'10px 14px',borderRadius:8,background:'rgba(255,107,138,.08)',border:'1px solid rgba(255,107,138,.2)',fontSize:12,color:'var(--danger)'}}>
                            ⚠ Atenção: cliente(s) com mais de 30% da receita. Considere diversificar a base.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tendência vs mês anterior */}
              <div className="block">
                <div className="block-head"><div className="block-title">📈 Tendência vs Mês Anterior</div></div>
                <div className="block-body">
                  {(() => {
                    const [y, mo] = currentMonth.split('-').map(Number);
                    const prevDate = new Date(y, mo - 2, 1);
                    const prevKey = prevDate.getFullYear() + '-' + String(prevDate.getMonth() + 1).padStart(2, '0');
                    const prev = db[prevKey];
                    if (!prev) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Sem dados do mês anterior para comparar.</div>;
                    const prevRecPJ = (prev['rec-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevRecPF = (prev['rec-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevCustPJ = (prev['cust-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0) + (prev['var-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevCustPF = (prev['cust-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const prevTotal = prevRecPJ + prevRecPF;
                    const prevCust = prevCustPJ + prevCustPF;
                    const prevRes = prevTotal - prevCust;
                    const items = [
                      { label: 'Receita PJ', atual: recPJ, anterior: prevRecPJ },
                      { label: 'Receita PF', atual: recPF, anterior: prevRecPF },
                      { label: 'Despesas', atual: custTotal, anterior: prevCust },
                      { label: 'Resultado', atual: resultado, anterior: prevRes },
                    ];
                    return (
                      <div>
                        {items.map((item, idx) => {
                          const diff = item.anterior > 0 ? ((item.atual - item.anterior) / item.anterior) * 100 : (item.atual > 0 ? 100 : 0);
                          const isUp = diff > 0;
                          const isDespesa = item.label === 'Despesas';
                          const good = isDespesa ? !isUp : isUp;
                          return (
                            <div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--line-soft)'}}>
                              <div>
                                <div style={{fontSize:13,marginBottom:4}}>{item.label}</div>
                                <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'JetBrains Mono,monospace'}}>
                                  ant: {fmtBR(item.anterior)}
                                </div>
                              </div>
                              <div style={{textAlign:'right'}}>
                                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600}}>{fmtBR(item.atual)}</div>
                                <div style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color: good ? 'var(--accent)' : 'var(--danger)',fontWeight:600}}>
                                  {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Receita vs Despesa - Barras do mês */}
            <div className="block" style={{marginTop:24}}>
              <div className="block-head"><div className="block-title">📊 Receita vs Despesa · Visual</div></div>
              <div className="block-body">
                {(() => {
                  const max = Math.max(recTotal, custTotal, 1);
                  return (
                    <div>
                      <div style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                          <span>Receitas</span>
                          <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--accent)'}}>{fmtBR(recTotal)}</span>
                        </div>
                        <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(recTotal/max*100)+'%',background:'linear-gradient(90deg,var(--accent),var(--accent-2))',borderRadius:6,transition:'width .4s'}}></div>
                        </div>
                      </div>
                      <div style={{marginBottom:16}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                          <span>Despesas</span>
                          <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--danger)'}}>{fmtBR(custTotal)}</span>
                        </div>
                        <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}>
                          <div style={{height:'100%',width:(custTotal/max*100)+'%',background:'linear-gradient(90deg,var(--danger),var(--warn))',borderRadius:6,transition:'width .4s',opacity:.8}}></div>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid var(--line)',fontSize:15}}>
                        <span style={{fontWeight:600}}>Resultado</span>
                        <span style={{fontFamily:'Fraunces,serif',fontSize:22,fontWeight:600,color:resultado>=0?'var(--accent)':'var(--danger)'}}>{fmtBR(resultado)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* GRAFICOS */}
            <div className="two-col">
              <div className="block">
                <div className="block-head"><div className="block-title">🎯 Concentração de Receita</div></div>
                <div className="block-body">
                  {(() => {
                    const clientes = (m['rec-pj'] || []).filter((r: any) => r.valor > 0 && r.status === 'Ativo');
                    if (!clientes.length) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Preencha os valores dos clientes.</div>;
                    const total = clientes.reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const sorted = [...clientes].sort((a: any, b: any) => (b.valor || 0) - (a.valor || 0));
                    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--info)', 'var(--warn)', '#c084fc', '#f472b6'];
                    return (<div>
                      <div style={{display:'flex',height:32,borderRadius:8,overflow:'hidden',marginBottom:16}}>
                        {sorted.map((cl: any, idx: number) => {
                          const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                          return <div key={idx} style={{width:pct+'%',background:colors[idx % colors.length],minWidth:2}} title={cl.cliente+': '+pct.toFixed(1)+'%'}></div>;
                        })}
                      </div>
                      {sorted.map((cl: any, idx: number) => {
                        const pct = total > 0 ? (cl.valor / total) * 100 : 0;
                        const isRisk = pct > 30;
                        return (<div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'1px solid var(--line-soft)',fontSize:13}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}>
                            <span style={{width:10,height:10,borderRadius:2,background:colors[idx % colors.length],display:'inline-block'}}></span>
                            <span>{cl.cliente}</span>
                          </div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',display:'flex',gap:12,alignItems:'center'}}>
                            <span>{fmtBR(cl.valor)}</span>
                            <span style={{color: isRisk ? 'var(--danger)' : 'var(--text-dim)',fontWeight: isRisk ? 600 : 400}}>{pct.toFixed(1)}%{isRisk ? ' ⚠' : ''}</span>
                          </div>
                        </div>);
                      })}
                    </div>);
                  })()}
                </div>
              </div>

              <div className="block">
                <div className="block-head"><div className="block-title">📈 Tendência vs Mês Anterior</div></div>
                <div className="block-body">
                  {(() => {
                    const [y2, mo2] = currentMonth.split('-').map(Number);
                    const prevDate2 = new Date(y2, mo2 - 2, 1);
                    const prevKey2 = prevDate2.getFullYear() + '-' + String(prevDate2.getMonth() + 1).padStart(2, '0');
                    const prev = db[prevKey2];
                    if (!prev) return <div style={{textAlign:'center',color:'var(--text-dim)',padding:20,fontSize:13}}>Sem dados do mês anterior.</div>;
                    const pRecPJ = (prev['rec-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pRecPF = (prev['rec-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pCustPJ = (prev['cust-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0) + (prev['var-pj'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pCustPF = (prev['cust-pf'] || []).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
                    const pTotal = pRecPJ + pRecPF;
                    const pCust = pCustPJ + pCustPF;
                    const pRes = pTotal - pCust;
                    const items = [
                      { label: 'Receita PJ', atual: recPJ, anterior: pRecPJ },
                      { label: 'Receita PF', atual: recPF, anterior: pRecPF },
                      { label: 'Despesas', atual: custTotal, anterior: pCust },
                      { label: 'Resultado', atual: resultado, anterior: pRes },
                    ];
                    return (<div>
                      {items.map((item, idx) => {
                        const diff = item.anterior > 0 ? ((item.atual - item.anterior) / item.anterior) * 100 : (item.atual > 0 ? 100 : 0);
                        const isUp = diff > 0;
                        const isDespesa = item.label === 'Despesas';
                        const good = isDespesa ? !isUp : isUp;
                        return (<div key={idx} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--line-soft)'}}>
                          <div>
                            <div style={{fontSize:13,marginBottom:4}}>{item.label}</div>
                            <div style={{fontSize:11,color:'var(--text-dim)',fontFamily:'JetBrains Mono,monospace'}}>ant: {fmtBR(item.anterior)}</div>
                          </div>
                          <div style={{textAlign:'right'}}>
                            <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600}}>{fmtBR(item.atual)}</div>
                            <div style={{fontSize:13,fontFamily:'JetBrains Mono,monospace',color: good ? 'var(--accent)' : 'var(--danger)',fontWeight:600}}>
                              {isUp ? '↑' : '↓'} {Math.abs(diff).toFixed(1)}%
                            </div>
                          </div>
                        </div>);
                      })}
                    </div>);
                  })()}
                </div>
              </div>
            </div>

            <div className="block" style={{marginTop:24}}>
              <div className="block-head"><div className="block-title">📊 Receita vs Despesa</div></div>
              <div className="block-body">
                {(() => {
                  const max = Math.max(recTotal, custTotal, 1);
                  return (<div>
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}><span>Receitas</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--accent)'}}>{fmtBR(recTotal)}</span></div>
                      <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}><div style={{height:'100%',width:(recTotal/max*100)+'%',background:'linear-gradient(90deg,var(--accent),var(--accent-2))',borderRadius:6}}></div></div>
                    </div>
                    <div style={{marginBottom:16}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}><span>Despesas</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--danger)'}}>{fmtBR(custTotal)}</span></div>
                      <div style={{height:28,background:'var(--bg-3)',borderRadius:6,overflow:'hidden'}}><div style={{height:'100%',width:(custTotal/max*100)+'%',background:'linear-gradient(90deg,var(--danger),var(--warn))',borderRadius:6,opacity:.8}}></div></div>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',paddingTop:12,borderTop:'2px solid var(--line)',fontSize:15}}>
                      <span style={{fontWeight:600}}>Resultado</span>
                      <span style={{fontFamily:'Fraunces,serif',fontSize:22,fontWeight:600,color:resultado>=0?'var(--accent)':'var(--danger)'}}>{fmtBR(resultado)}</span>
                    </div>
                  </div>);
                })()}
              </div>
            </div>

          </section>
        )}

        {/* PJ */}
        {activeTab === 'pj' && (
          <section>
            <h2 className="section-title">PJ · APR Digital</h2>
            <p className="section-sub">Receitas dos clientes e custos fixos da agência</p>

            <TableBlock title="💰 Receitas · Clientes" badge="recorrente + projeto" badgeClass="pj"
              data={m['rec-pj'] || []} fields={[
                { k: 'cliente', type: 'text', ph: 'Nome do cliente' },
                { k: 'squad', type: 'select', opts: ['Lançamentos', 'Perpétuo', 'Negócios Locais', 'Outros'] },
                { k: 'tipo', type: 'select', opts: ['Recorrente', 'Projeto', 'Comissão', 'Outros'] },
                { k: 'status', type: 'select', opts: ['Ativo', 'Negociação', 'Pausado', 'Finalizado'] },
                { k: 'dia', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'recebido', type: 'check', right: true },
              ]} headers={['Cliente', 'Squad', 'Tipo', 'Status', 'Dia pgto', 'Valor (R$)', 'Recebido?']}
              onUpd={(i, f, v) => updRow('rec-pj', i, f, v)} onDel={i => delRow('rec-pj', i)} onAdd={() => addRow('rec-pj')}
              totalLabel="TOTAL RECEITAS PJ" totalSpan={5} totalValue={fmtBR(recPJ)} />

            <TableBlock title="📉 Custos Fixos · Agência" badge="mensal" badgeClass="pj"
              data={m['cust-pj'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cat', type: 'select', opts: ['Equipe', 'Ferramentas', 'Impostos', 'Infra', 'Administrativo', 'Marketing', 'Outros'] },
                { k: 'venc', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'pago', type: 'check', right: true },
              ]} headers={['Descrição', 'Categoria', 'Vencimento', 'Valor (R$)', 'Pago?']}
              onUpd={(i, f, v) => updRow('cust-pj', i, f, v)} onDel={i => delRow('cust-pj', i)} onAdd={() => addRow('cust-pj')}
              totalLabel="TOTAL CUSTOS PJ" totalSpan={3} totalValue={fmtBR(sumValor(m['cust-pj']))} />

            <TableBlock title="🎯 Custos Variáveis / Projetos" badge="pontual"
              data={m['var-pj'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cliente', type: 'text', ph: 'Cliente/Projeto' },
                { k: 'data', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
              ]} headers={['Descrição', 'Cliente/Projeto', 'Data', 'Valor (R$)']}
              onUpd={(i, f, v) => updRow('var-pj', i, f, v)} onDel={i => delRow('var-pj', i)} onAdd={() => addRow('var-pj')}
              totalLabel="TOTAL VARIÁVEIS" totalSpan={3} totalValue={fmtBR(sumValor(m['var-pj']))} />
          </section>
        )}

        {/* PF */}
        {activeTab === 'pf' && (
          <section>
            <h2 className="section-title">PF · Pessoal</h2>
            <p className="section-sub">Suas finanças pessoais — entradas, custos fixos e variáveis</p>

            <TableBlock title="💚 Entradas · PF" badge="renda" badgeClass="pf"
              data={m['rec-pf'] || []} fields={[
                { k: 'origem', type: 'text', ph: 'Origem' },
                { k: 'tipo', type: 'select', opts: ['Salário', 'Pró-labore', 'Comissão', 'Aluguel', 'Investimento', 'Outros'] },
                { k: 'data', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'recebido', type: 'check', right: true },
              ]} headers={['Origem', 'Tipo', 'Data', 'Valor (R$)', 'Recebido?']}
              onUpd={(i, f, v) => updRow('rec-pf', i, f, v)} onDel={i => delRow('rec-pf', i)} onAdd={() => addRow('rec-pf')}
              totalLabel="TOTAL ENTRADAS PF" totalSpan={3} totalValue={fmtBR(recPF)} />

            <TableBlock title="🏠 Custos Fixos · Pessoal" badge="mensal" badgeClass="pf"
              data={m['cust-pf'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cat', type: 'select', opts: ['Moradia', 'Alimentação', 'Utilidades', 'Saúde', 'Bem-estar', 'Transporte', 'Lazer', 'Educação', 'Filhos', 'Pets', 'Outros'] },
                { k: 'venc', type: 'text', ph: 'dia' },
                { k: 'valor', type: 'number', right: true },
                { k: 'pago', type: 'check', right: true },
              ]} headers={['Descrição', 'Categoria', 'Vencimento', 'Valor (R$)', 'Pago?']}
              onUpd={(i, f, v) => updRow('cust-pf', i, f, v)} onDel={i => delRow('cust-pf', i)} onAdd={() => addRow('cust-pf')}
              totalLabel="TOTAL CUSTOS PF" totalSpan={3} totalValue={fmtBR(sumValor(m['cust-pf']))} />


          </section>
        )}

        {/* CARTÕES */}
        {activeTab === 'cartoes' && (
          <section>
            <h2 className="section-title">Cartões de Crédito</h2>
            <p className="section-sub">Acompanhamento de limites, faturas e lançamentos</p>

            <div className="block">
              <div className="block-head"><div className="block-title">💳 Meus Cartões</div></div>
              <div className="block-body">
                <div className="cards-row">
                  {(m['cards'] || []).length === 0 ? <div className="empty">Nenhum cartão cadastrado.</div> :
                    (m['cards'] || []).map((c: any, i: number) => {
                      const usado = c.limite > 0 ? (c.fatura / c.limite) * 100 : 0;
                      const cls = usado > 80 ? 'danger' : (usado > 60 ? 'warn' : '');
                      return (
                        <div key={i} className="card-tile">
                          <div className="card-name">{c.nome || 'Sem nome'}<span className="card-flag">{c.bandeira} · {c.titular}</span></div>
                          <div className="card-row"><span className="lbl">Limite</span><span className="val">{fmtBR(c.limite || 0)}</span></div>
                          <div className="card-row"><span className="lbl">Fatura atual</span><span className="val">{fmtBR(c.fatura || 0)}</span></div>
                          <div className="card-row"><span className="lbl">Vence dia</span><span className="val">{c.venc || '—'}</span></div>
                          <div className="progress"><div className={`progress-bar ${cls}`} style={{ width: `${Math.min(usado, 100)}%` }}></div></div>
                          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, fontFamily: 'JetBrains Mono,monospace' }}>{fmtPct(usado)} do limite</div>
                        </div>
                      );
                    })
                  }
                </div>
                <div style={{ marginTop: 20 }}>
                  <TableInner data={m['cards'] || []} fields={[
                    { k: 'nome', type: 'text', ph: 'Nome do cartão' },
                    { k: 'bandeira', type: 'select', opts: ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outros'] },
                    { k: 'titular', type: 'select', opts: ['PJ', 'PF'] },
                    { k: 'limite', type: 'number', right: true },
                    { k: 'fatura', type: 'number', right: true },
                    { k: 'venc', type: 'text', ph: 'dia' },
                  ]} headers={['Cartão', 'Bandeira', 'Titularidade', 'Limite', 'Fatura atual', 'Vence dia']}
                    onUpd={(i, f, v) => updRow('cards', i, f, v)} onDel={i => delRow('cards', i)} />
                  <div className="add-row"><button className="btn btn-primary" onClick={() => addRow('cards')}>+ Adicionar cartão</button></div>
                </div>
              </div>
            </div>

            <TableBlock title="📝 Lançamentos no Cartão"
              data={m['card-tx'] || []} fields={[
                { k: 'data', type: 'text', ph: 'dd' },
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'cartao', type: 'cardSelect', cards: m['cards'] || [] },
                { k: 'cat', type: 'select', opts: ['Ferramentas', 'Compras', 'Restaurante', 'Viagem', 'Equipe', 'Marketing', 'Saúde', 'Outros'] },
                { k: 'origem', type: 'select', opts: ['PJ', 'PF'] },
                { k: 'valor', type: 'number', right: true },
                { k: 'parcelas', type: 'text', ph: '1x' },
              ]} headers={['Data', 'Descrição', 'Cartão', 'Categoria', 'PJ/PF', 'Valor (R$)', 'Parcelas']}
              onUpd={(i, f, v) => updRow('card-tx', i, f, v)} onDel={i => delRow('card-tx', i)} onAdd={() => addRow('card-tx')}
              totalLabel="TOTAL LANÇADO NO MÊS" totalSpan={5} totalValue={fmtBR(sumValor(m['card-tx']))} />
          </section>
        )}

        {/* FLUXO */}
        {activeTab === 'fluxo' && <FluxoTab m={m} fmtBR={fmtBR} />}

        {/* METAS */}
        {activeTab === 'metas' && (
          <section>
            <h2 className="section-title">Metas Mensais</h2>
            <p className="section-sub">Objetivos financeiros e reserva</p>

            <TableBlock title="🎯 Metas do mês"
              data={m['metas'] || []} fields={[
                { k: 'meta', type: 'text', ph: 'Descrição da meta' },
                { k: 'cat', type: 'select', opts: ['Faturamento', 'Reserva', 'Investimento', 'Pessoal', 'Equipe', 'Outros'] },
                { k: 'alvo', type: 'number', right: true },
                { k: 'real', type: 'number', right: true },
                { k: 'progress', type: 'progress' },
              ]} headers={['Meta', 'Categoria', 'Alvo (R$)', 'Realizado (R$)', 'Progresso']}
              onUpd={(i, f, v) => updRow('metas', i, f, v)} onDel={i => delRow('metas', i)} onAdd={() => addRow('metas')} />

            <TableBlock title="💎 Reserva e Investimentos"
              data={m['reserva'] || []} fields={[
                { k: 'desc', type: 'text', ph: 'Descrição' },
                { k: 'tipo', type: 'text', ph: 'Tipo de aplicação' },
                { k: 'saldo', type: 'number', right: true },
                { k: 'aporte', type: 'number', right: true },
              ]} headers={['Descrição', 'Tipo', 'Saldo atual (R$)', 'Aporte mês (R$)']}
              onUpd={(i, f, v) => updRow('reserva', i, f, v)} onDel={i => delRow('reserva', i)} onAdd={() => addRow('reserva')}
              totalLabel="TOTAL RESERVA" totalSpan={2} totalValue={fmtBR((m['reserva'] || []).reduce((s: number, r: any) => s + (parseFloat(r.saldo) || 0), 0))} />
          </section>
        )}

        {/* DRE */}
        {activeTab === 'dre' && <DreTab m={m} recPJ={recPJ} custPJ={custPJ} recPJReceived={recPJReceived} fmtBR={fmtBR} fmtPct={fmtPct} sumValor={sumValor} updateMonth={updateMonth} />}

        {/* CENÁRIOS */}
        {activeTab === 'cenarios' && <CenariosTab recTotal={recTotal} custTotal={custTotal} fmtBR={fmtBR} fmtPct={fmtPct} />}

      </main>
    </div>
  );
}

/* ============ COMPONENTES REUTILIZÁVEIS ============ */
function TableBlock(props: any) {
  return (
    <div className="block">
      <div className="block-head">
        <div className="block-title">{props.title} {props.badge && <span className={`badge ${props.badgeClass || ''}`}>{props.badge}</span>}</div>
      </div>
      <div className="block-body">
        <TableInner {...props} />
        {props.totalLabel && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 8px 0', marginTop: 8, borderTop: '2px solid var(--line)', fontWeight: 600, color: 'var(--accent)', fontFamily: 'JetBrains Mono,monospace', fontSize: 13 }}>
            <span>{props.totalLabel}</span>
            <span>{props.totalValue}</span>
          </div>
        )}
        {props.onAdd && <div className="add-row"><button className="btn btn-primary" onClick={props.onAdd}>+ Adicionar</button></div>}
      </div>
    </div>
  );
}

function TableInner({ data, fields, headers, onUpd, onDel }: any) {
  return (
    <table>
      <thead><tr>{headers.map((h: string, i: number) => <th key={i} style={{ textAlign: fields[i]?.right ? 'right' : 'left' }}>{h}</th>)}<th></th></tr></thead>
      <tbody>
        {data.length === 0 ? <tr><td colSpan={headers.length + 1} style={{ padding: '24px 8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: 13 }}>Nenhum lançamento.</td></tr> :
          data.map((row: any, i: number) => (
            <tr key={i}>
              {fields.map((f: any, j: number) => (
                <td key={j} className={f.right ? 'right' : ''}>
                  {renderField(f, row, i, onUpd)}
                </td>
              ))}
              <td style={{ width: 36, textAlign: 'right' }}><button className="btn-del" onClick={() => onDel(i)} title="Remover">✕</button></td>
            </tr>
          ))
        }
      </tbody>
    </table>
  );
}

function renderField(f: any, row: any, i: number, onUpd: any) {
  if (f.type === 'text')
    return <input type="text" defaultValue={row[f.k] ?? ''} placeholder={f.ph || ''} onBlur={e => onUpd(i, f.k, e.target.value)} />;
  if (f.type === 'number')
    return <input type="number" step="0.01" defaultValue={row[f.k] || ''} onBlur={e => onUpd(i, f.k, parseFloat(e.target.value) || 0)} />;
  if (f.type === 'select')
    return <select value={row[f.k] || f.opts[0]} onChange={e => onUpd(i, f.k, e.target.value)}>{f.opts.map((o: string) => <option key={o} value={o}>{o}</option>)}</select>;
  if (f.type === 'check')
    return <input type="checkbox" checked={!!row[f.k]} onChange={e => onUpd(i, f.k, e.target.checked)} style={{ width: 'auto' }} />;
  if (f.type === 'cardSelect')
    return <select value={row[f.k] || ''} onChange={e => onUpd(i, f.k, e.target.value)}><option value="">—</option>{(f.cards || []).map((c: any, k: number) => <option key={k}>{c.nome}</option>)}</select>;
  if (f.type === 'progress') {
    const pct = row.alvo > 0 ? Math.min(100, (row.real / row.alvo) * 100) : 0;
    const cls = pct >= 80 ? '' : (pct >= 40 ? 'warn' : 'danger');
    return <>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'JetBrains Mono,monospace' }}>{(Math.round(pct * 10) / 10).toFixed(1)}%</div>
      <div className="progress"><div className={`progress-bar ${cls}`} style={{ width: `${pct}%` }}></div></div>
    </>;
  }
  return null;
}

function FluxoTab({ m, fmtBR }: any) {
  const events: any[] = [];
  (m['rec-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: '05', tipo: 'Entrada', desc: r.cliente, origem: 'PJ', valor: +r.valor }); });
  (m['rec-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '05', tipo: 'Entrada', desc: r.origem, origem: 'PF', valor: +r.valor }); });
  (m['cust-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.venc || '15', tipo: 'Saída', desc: r.desc, origem: 'PJ', valor: -Math.abs(+r.valor) }); });
  (m['var-pj'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '20', tipo: 'Saída', desc: r.desc, origem: 'PJ', valor: -Math.abs(+r.valor) }); });
  (m['cust-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.venc || '15', tipo: 'Saída', desc: r.desc, origem: 'PF', valor: -Math.abs(+r.valor) }); });
  (m['var-pf'] || []).forEach((r: any) => { if (r.valor > 0) events.push({ data: r.data || '20', tipo: 'Saída', desc: r.desc, origem: 'PF', valor: -Math.abs(+r.valor) }); });
  events.sort((a, b) => (parseInt(a.data) || 0) - (parseInt(b.data) || 0));
  let saldo = 0, totIn = 0, totOut = 0;

  return (
    <section>
      <h2 className="section-title">Fluxo de Caixa</h2>
      <p className="section-sub">Movimentações do mês organizadas por data</p>
      <div className="kpi-grid">
        <div className="kpi"><div className="kpi-label">Entradas</div><div className="kpi-value pos">{fmtBR(events.filter(e => e.valor > 0).reduce((s, e) => s + e.valor, 0))}</div></div>
        <div className="kpi danger"><div className="kpi-label">Saídas</div><div className="kpi-value neg">{fmtBR(events.filter(e => e.valor < 0).reduce((s, e) => s + Math.abs(e.valor), 0))}</div></div>
        <div className="kpi pf"><div className="kpi-label">Saldo do mês</div><div className="kpi-value">{fmtBR(events.reduce((s, e) => s + e.valor, 0))}</div></div>
      </div>
      <div className="block">
        <div className="block-head"><div className="block-title">📅 Linha do tempo</div></div>
        <div className="block-body">
          <table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Origem</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Saldo</th></tr></thead>
            <tbody>
              {events.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 24 }}>Sem movimentações.</td></tr> :
                events.map((e, i) => {
                  saldo += e.valor;
                  const color = e.valor >= 0 ? 'var(--accent)' : 'var(--danger)';
                  return (
                    <tr key={i}>
                      <td style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12 }}>{e.data}</td>
                      <td><span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: e.valor >= 0 ? 'rgba(200,255,90,.1)' : 'rgba(255,107,138,.1)', color, fontFamily: 'JetBrains Mono,monospace' }}>{e.tipo}</span></td>
                      <td>{e.desc}</td>
                      <td><span className={`badge ${e.origem.toLowerCase()}`}>{e.origem}</span></td>
                      <td className="right" style={{ color }}>{fmtBR(e.valor)}</td>
                      <td className="right" style={{ color: saldo >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{fmtBR(saldo)}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DreTab({ m, recPJ, custPJ, recPJReceived, fmtBR, fmtPct, sumValor, updateMonth }: any) {
  const cat = (c: string) => (m['cust-pj'] || []).filter((r: any) => r.cat === c).reduce((s: number, r: any) => s + (+r.valor || 0), 0);
  const custEquipe = cat('Equipe');
  const custFerr = cat('Ferramentas') + cat('Infra');
  const custAdm = cat('Administrativo') + cat('Marketing');
  const custImp = cat('Impostos');
  const custOut = cat('Outros');
  const variaveis = sumValor(m['var-pj']);
  const totalCustOp = custEquipe + custFerr + custAdm + custOut + variaveis;
  const ebitda = recPJ - totalCustOp;
  const lucro = ebitda - custImp;
  const ativos = (m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo' && r.valor > 0);

  return (
    <section>
      <h2 className="section-title">DRE Simplificada · PJ</h2>
      <p className="section-sub">Demonstração de resultado da APR Digital</p>
      <div className="block"><div className="block-body">
        <div className="dre-row h"><span>Receita Bruta · PJ</span><span></span></div>
        <div className="dre-row"><span>(+) Faturamento de clientes</span><span className="v">{fmtBR(recPJ)}</span></div>
        <div className="dre-row h" style={{ marginTop: 8 }}><span>Custos Operacionais</span><span></span></div>
        <div className="dre-row neg indent"><span>Equipe e freelas</span><span className="v">- {fmtBR(custEquipe)}</span></div>
        <div className="dre-row neg indent"><span>Ferramentas e infraestrutura</span><span className="v">- {fmtBR(custFerr)}</span></div>
        <div className="dre-row neg indent"><span>Administrativo e marketing</span><span className="v">- {fmtBR(custAdm)}</span></div>
        <div className="dre-row neg indent"><span>Custos variáveis / projetos</span><span className="v">- {fmtBR(variaveis)}</span></div>
        <div className="dre-row neg indent"><span>Outros custos</span><span className="v">- {fmtBR(custOut)}</span></div>
        <div className="dre-row" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 8 }}><span><strong>EBITDA</strong></span><span className="v" style={{ color: ebitda >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>{fmtBR(ebitda)}</span></div>
        <div className="dre-row h" style={{ marginTop: 8 }}><span>Tributação</span><span></span></div>
        <div className="dre-row neg indent"><span>Impostos (Simples)</span><span className="v">- {fmtBR(custImp)}</span></div>
        <div className="dre-row total"><span>LUCRO LÍQUIDO PJ</span><span className="v">{fmtBR(lucro)}</span></div>
      </div></div>

      <div className="two-col">
        <div className="block"><div className="block-head"><div className="block-title">📈 Indicadores</div></div><div className="block-body">
          <div className="dre-row"><span>Ticket médio cliente</span><span className="v">{fmtBR(ativos.length ? recPJ / ativos.length : 0)}</span></div>
          <div className="dre-row"><span>Margem operacional</span><span className="v">{fmtPct(recPJ > 0 ? (lucro / recPJ) * 100 : 0)}</span></div>
          <div className="dre-row"><span>Custo fixo / Receita</span><span className="v">{fmtPct(recPJ > 0 ? (custPJ / recPJ) * 100 : 0)}</span></div>
          <div className="dre-row"><span>Clientes ativos</span><span className="v">{(m['rec-pj'] || []).filter((r: any) => r.status === 'Ativo').length}</span></div>
          <div className="dre-row"><span>Recebido / Faturado</span><span className="v">{fmtPct(recPJ > 0 ? (recPJReceived / recPJ) * 100 : 0)}</span></div>
        </div></div>
        <div className="block"><div className="block-head"><div className="block-title">💡 Observações</div></div><div className="block-body">
          <textarea defaultValue={m.notes || ''} onBlur={e => updateMonth((mm: any) => { mm.notes = e.target.value; return mm; })}
            style={{ width: '100%', minHeight: 160, background: 'var(--bg-2)', border: '1px solid var(--line)', color: 'var(--text)', padding: 12, borderRadius: 8, fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="Anote aqui observações sobre o mês..." />
        </div></div>
      </div>
    </section>
  );
}

function CenariosTab({ recTotal, custTotal, fmtBR, fmtPct }: any) {
  const [pess, setPess] = useState(-30);
  const [real, setReal] = useState(0);
  const [opt, setOpt] = useState(40);
  const make = (label: string, pct: number, cls: string) => {
    const rec = recTotal * (1 + pct / 100);
    const res = rec - custTotal;
    const margem = rec > 0 ? (res / rec) * 100 : 0;
    return (
      <div className={`scenario ${cls}`}>
        <h4>{label}<span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--text-dim)' }}>{pct >= 0 ? '+' : ''}{pct}%</span></h4>
        <div className="small">Receita projetada</div>
        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, color: 'var(--text-soft)' }}>{fmtBR(rec)}</div>
        <div className="small" style={{ marginTop: 10 }}>Resultado líquido</div>
        <div className="big">{fmtBR(res)}</div>
        <div className="small">Margem {fmtPct(margem)}</div>
      </div>
    );
  };
  return (
    <section>
      <h2 className="section-title">Cenários · Projeção</h2>
      <p className="section-sub">Simulação do mês com 3 cenários</p>
      <div className="block"><div className="block-body">
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Pessimista</label><input type="number" value={pess} step={5} onChange={e => setPess(+e.target.value || 0)} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Realista</label><input type="number" value={real} step={5} onChange={e => setReal(+e.target.value || 0)} /></div>
          <div><label style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.1em' }}>% Otimista</label><input type="number" value={opt} step={5} onChange={e => setOpt(+e.target.value || 0)} /></div>
        </div>
        <div className="scenarios">
          {make('Pessimista', pess, 'pessimist')}
          {make('Realista', real, 'realist')}
          {make('Otimista', opt, 'optimist')}
        </div>
      </div></div>
    </section>
  );
}
