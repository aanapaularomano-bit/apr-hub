// ─── Alert Rules — Central de Controle ───────────────────────────────────────
// Edite aqui para adicionar, remover ou ajustar regras de alerta automático.
// Cada regra recebe (dash, client) e retorna null (sem alerta) ou { message, action }.

export type AlertSeverity = 'critico' | 'atencao';

export interface AutoAlert {
  clientId: string;
  clientName: string;
  severity: AlertSeverity;
  rule: string;
  message: string;
  action: string;
}

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

// ─── Regra 1: Sem dados há 2+ dias ───────────────────────────────────────────
function checkSemSync(dash: any): { message: string; action: string } | null {
  if (!dash?.sheet_url) return null; // sem planilha configurada, não alertar
  if (!dash.last_sync) {
    return {
      message: 'Planilha configurada mas nunca sincronizada',
      action: 'Clique em "Sincronizar Agora" no dashboard',
    };
  }
  const diff = Date.now() - new Date(dash.last_sync).getTime();
  if (diff > TWO_DAYS_MS) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return {
      message: `Sem dados novos há ${days} dia${days > 1 ? 's' : ''}`,
      action: 'Verifique a planilha do Stract e sincronize manualmente',
    };
  }
  return null;
}

// ─── Regra 2: Gasto zerado nos últimos 3 dias (campanha parada) ───────────────
function checkGastoZerado(dash: any): { message: string; action: string } | null {
  if (!Array.isArray(dash?.daily_data) || dash.daily_data.length < 2) return null;
  if ((dash.investimento || 0) === 0) return null; // campanha pode não ter começado
  const recent = dash.daily_data.slice(-3);
  const spendRecente = recent.reduce((s: number, d: any) => s + (d.investimento || 0), 0);
  if (spendRecente === 0) {
    return {
      message: 'Investimento zerado nos últimos 3 dias',
      action: 'Verifique se as campanhas estão ativas no Meta Ads',
    };
  }
  return null;
}

// ─── Regra 3: Verba do período >90% consumida ────────────────────────────────
function checkVerbaConsumida(dash: any): { message: string; action: string } | null {
  if (!dash?.budget_total || dash.budget_total <= 0 || !dash?.investimento) return null;
  const pct = dash.investimento / dash.budget_total;
  if (pct >= 0.9) {
    return {
      message: `Verba ${Math.round(pct * 100)}% consumida`,
      action: 'Avalie aumentar orçamento ou pausar campanhas',
    };
  }
  return null;
}

// ─── Regra 4: CPL acima do teto definido para o cliente ──────────────────────
// Requer campo `cpl_teto` preenchido no dashboard (aba Geral do DashboardManager)
function checkCplAlto(dash: any): { message: string; action: string } | null {
  if (!dash?.cpl_teto || dash.cpl_teto <= 0 || !dash?.cpl || dash.cpl <= 0) return null;
  if (dash.cpl > dash.cpl_teto) {
    const fmt = (n: number) => 'R$ ' + n.toFixed(2);
    return {
      message: `CPL ${fmt(dash.cpl)} acima do teto ${fmt(dash.cpl_teto)}`,
      action: 'Revise criativos e segmentacao das campanhas',
    };
  }
  return null;
}

// ─── Regra 5: ROAS abaixo da meta ────────────────────────────────────────────
// Requer campo `roas_meta` preenchido no dashboard
function checkRoasBaixo(dash: any): { message: string; action: string } | null {
  if (!dash?.roas_meta || dash.roas_meta <= 0 || !dash?.roas || dash.roas <= 0) return null;
  if (dash.roas < dash.roas_meta) {
    return {
      message: `ROAS ${dash.roas.toFixed(2)}x abaixo da meta ${dash.roas_meta.toFixed(2)}x`,
      action: 'Analise anuncios de menor performance e otimize',
    };
  }
  return null;
}

// ─── Regra 6: Ritmo de leads abaixo do necessário para bater a meta ──────────
// Requer campos `leads_meta` (total esperado no periodo) e `date_start`/`date_end`
function checkRitmoLeads(dash: any): { message: string; action: string } | null {
  if (!dash?.leads_meta || dash.leads_meta <= 0 || !dash?.leads_total) return null;
  if (!dash?.date_start || !dash?.date_end) return null;
  const start = new Date(dash.date_start).getTime();
  const end = new Date(dash.date_end).getTime();
  const now = Date.now();
  if (now <= start || now >= end) return null;
  const elapsed = (now - start) / (end - start); // 0–1
  const expectedLeads = dash.leads_meta * elapsed;
  if (dash.leads_total < expectedLeads * 0.8) {
    const deficit = Math.round(expectedLeads - dash.leads_total);
    return {
      message: `Ritmo de leads abaixo: ${deficit} leads atrasados vs. meta`,
      action: 'Revise budget e criativos para acelerar captacao',
    };
  }
  return null;
}

// ─── Engine principal ─────────────────────────────────────────────────────────
export function computeAutoAlerts(clients: any[], dashboards: any[]): AutoAlert[] {
  const alerts: AutoAlert[] = [];

  for (const client of clients) {
    if (client.status !== 'ativo') continue;
    const dash = dashboards.find(d => d.client_id === client.id);

    const checks: Array<[AlertSeverity, string, ReturnType<typeof checkSemSync>]> = [
      ['critico',  'sem_sync',        checkSemSync(dash)],
      ['critico',  'gasto_zerado',    checkGastoZerado(dash)],
      ['atencao',  'verba_consumida', checkVerbaConsumida(dash)],
      ['atencao',  'cpl_alto',        checkCplAlto(dash)],
      ['atencao',  'roas_baixo',      checkRoasBaixo(dash)],
      ['atencao',  'ritmo_leads',     checkRitmoLeads(dash)],
    ];

    for (const [severity, rule, result] of checks) {
      if (result) {
        alerts.push({
          clientId: client.id,
          clientName: client.name,
          severity,
          rule,
          message: result.message,
          action: result.action,
        });
      }
    }
  }

  // Criticos primeiro, depois atencao; dentro de cada grupo, ordem alfabetica
  return alerts.sort((a, b) => {
    if (a.severity === 'critico' && b.severity !== 'critico') return -1;
    if (a.severity !== 'critico' && b.severity === 'critico') return 1;
    return a.clientName.localeCompare(b.clientName);
  });
}
