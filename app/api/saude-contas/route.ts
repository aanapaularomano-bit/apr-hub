import { NextResponse } from 'next/server';

// Saúde das contas de anúncio — lê direto do gerenciador da Meta (somente leitura).
// Protegida pelo middleware (cookie apr_auth). Precisa de META_ACCESS_TOKEN no ambiente.

export const dynamic = 'force-dynamic';

const GRAPH = 'https://graph.facebook.com/v21.0';

const FIELDS = [
  'name',
  'account_id',
  'account_status',
  'disable_reason',
  'currency',
  'amount_spent',
  'spend_cap',
  'funding_source_details',
  'is_prepay_account',
  'business{name}',
  'insights.date_preset(yesterday).as(ontem){spend,actions}',
  'insights.date_preset(last_7d).as(semana){spend,actions}',
  'insights.date_preset(last_30d).as(mes){spend}',
].join(',');

// https://developers.facebook.com/docs/marketing-api/reference/ad-account
const STATUS: Record<number, { label: string; nivel: 'ok' | 'critico' | 'atencao' | 'fechada' }> = {
  1: { label: 'Ativa', nivel: 'ok' },
  2: { label: 'Desativada', nivel: 'critico' },
  3: { label: 'Pagamento pendente', nivel: 'critico' },
  7: { label: 'Em análise de risco', nivel: 'atencao' },
  8: { label: 'Pagamento em acerto', nivel: 'atencao' },
  9: { label: 'Carência de pagamento', nivel: 'critico' },
  100: { label: 'Encerramento pendente', nivel: 'atencao' },
  101: { label: 'Encerrada', nivel: 'fechada' },
  201: { label: 'Ativa', nivel: 'ok' },
  202: { label: 'Encerrada', nivel: 'fechada' },
};

const MOTIVO: Record<number, string> = {
  1: 'Violação de política de anúncios',
  2: 'Revisão de integridade',
  3: 'Risco de pagamento',
  4: 'Conta de teste encerrada',
  5: 'Conta de agência desativada',
  6: 'Revisão de negócio',
  7: 'Revisão de integridade (Business)',
  8: 'Permanentemente encerrada',
  9: 'Conta de revenda inativa',
  10: 'Conta não confirmada',
};

const SALDO_BAIXO = 100; // aviso para conta pré-paga com saldo abaixo disso

function soma(actions: any[] | undefined, tipos: string[]) {
  if (!Array.isArray(actions)) return 0;
  return Math.max(0, ...tipos.map(t => Number(actions.find(a => a.action_type === t)?.value || 0)));
}

function resultados(ins: any) {
  const a = ins?.actions;
  const leads = soma(a, ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead']);
  const conversas = soma(a, ['onsite_conversion.messaging_conversation_started_7d']);
  const compras = soma(a, ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase']);
  return { gasto: Number(ins?.spend || 0), leads, conversas, compras, total: leads + conversas + compras };
}

function saldoPrePago(display: string | undefined): number | null {
  if (!display || !/saldo/i.test(display)) return null;
  const m = display.match(/([\d.]+,\d{2})/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, '').replace(',', '.'));
}

export async function GET() {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'META_ACCESS_TOKEN não configurado no servidor' }, { status: 500 });
  }

  const contas: any[] = [];
  let url: string | null = `${GRAPH}/me/adaccounts?fields=${encodeURIComponent(FIELDS)}&limit=50&access_token=${token}`;
  try {
    for (let i = 0; url && i < 20; i++) {
      const res: Response = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      if (json.error) {
        return NextResponse.json({ error: json.error.message || 'Erro na Meta' }, { status: 502 });
      }
      contas.push(...(json.data || []));
      url = json.paging?.next || null;
    }
  } catch (e: any) {
    return NextResponse.json({ error: 'Falha ao falar com a Meta: ' + (e?.message || e) }, { status: 502 });
  }

  const linhas = contas.map(c => {
    const st = STATUS[c.account_status] || { label: 'Status ' + c.account_status, nivel: 'atencao' as const };
    const ontem = resultados(c.ontem?.data?.[0]);
    const semana = resultados(c.semana?.data?.[0]);
    const gasto30 = Number(c.mes?.data?.[0]?.spend || 0);
    const pagamento = c.funding_source_details?.display_string || '';
    const saldo = saldoPrePago(pagamento);

    const alertas: { nivel: 'critico' | 'atencao'; texto: string }[] = [];
    if (st.nivel === 'critico' || st.nivel === 'atencao') {
      const motivo = c.disable_reason ? MOTIVO[c.disable_reason] : '';
      alertas.push({ nivel: st.nivel, texto: st.label + (motivo ? ' — ' + motivo : '') });
    }
    if (st.nivel === 'ok') {
      if (ontem.gasto > 0 && ontem.total === 0 && semana.total > 0) {
        alertas.push({ nivel: 'atencao', texto: 'Gastou ontem e não gerou resultado' });
      }
      if (ontem.gasto === 0 && semana.gasto > 0) {
        alertas.push({ nivel: 'atencao', texto: 'Parou de gastar ontem' });
      }
      if (saldo !== null && saldo < SALDO_BAIXO && semana.gasto > 0) {
        alertas.push({ nivel: saldo <= 0 ? 'critico' : 'atencao', texto: `Saldo pré-pago baixo (${pagamento.replace(/^Saldo disponível\s*/i, '')})` });
      }
    }

    return {
      id: c.account_id,
      nome: c.name,
      bm: c.business?.name || '',
      moeda: c.currency,
      status: st.label,
      nivel: st.nivel,
      pagamento,
      ontem,
      semana,
      gasto30,
      alertas,
      link: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${c.account_id}`,
      pagamentoLink: `https://business.facebook.com/billing_hub/accounts/details?asset_id=${c.account_id}`,
    };
  });

  return NextResponse.json({ atualizadoEm: new Date().toISOString(), contas: linhas });
}
