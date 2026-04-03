import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

/* ═══════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════ */

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function parseNumber(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  // UNFORMATTED_VALUE returns raw numbers, just parse directly
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  // If it has comma as decimal (Brazilian format text), convert
  if (str.includes(',') && !str.includes('.')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  return parseFloat(str) || 0;
}

function parseCampaignName(name: string) {
  // Pattern: CLIENTE_ANO_MES_PRODUTO_FASEXX_ETAPA
  // Example: C2PRO_2026_MARCO_900+ENEM_FASE01_CAPTACAO
  // Example: C2PRO_2026_MARCO_900+ENEM_FASE01_CAPTACAO_2
  // Example: C2PRO_2026_MARCO_900+ENEM_FASE01_CAPTACAO_PQ
  const parts = name.split('_');
  if (parts.length < 5) return null;

  const cliente = parts[0];
  const ano = parts[1];
  const mes = parts[2];

  // Find FASE part
  let faseIdx = parts.findIndex(p => p.startsWith('FASE'));
  if (faseIdx === -1) return null;

  const produto = parts.slice(3, faseIdx).join('_');
  const fase = parts[faseIdx];

  // Everything after FASE is the etapa (CAPTACAO, CAPTACAO_2, CAPTACAO_PQ, etc)
  const etapa = parts.slice(faseIdx + 1).join('_');

  return { cliente, ano, mes, produto, fase, etapa };
}

function getAdType(adName: string): string {
  if (adName.includes('_VID')) return 'Vídeo';
  if (adName.includes('_IMG')) return 'Imagem';
  if (adName.includes('_CAR')) return 'Carrossel';
  if (adName.includes('_DIN')) return 'Dinâmico';
  return 'Outro';
}

function getAudienceTemp(adsetName: string): string {
  const lower = adsetName.toLowerCase();
  if (lower.includes('envolvimento') || lower.includes('remarketing') || lower.includes('retargeting') || lower.includes('custom') || lower.includes('lookalike') || lower.includes('lal')) return 'Quente';
  if (lower.includes('interesse') || lower.includes('broad') || lower.includes('aberto')) return 'Frio';
  return 'Misto';
}

/* ═══════════════════════════════════════════
   FETCH GOOGLE SHEETS
   ═══════════════════════════════════════════ */

async function fetchSheetData(spreadsheetId: string, sheetName?: string): Promise<any[][]> {
  const range = sheetName ? encodeURIComponent(sheetName) : 'Sheet1';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${SHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;

  const res = await fetch(url);
  if (!res.ok) {
    // Try without sheet name (default first sheet)
    const url2 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${SHEETS_API_KEY}&fields=sheets.properties.title`;
    const res2 = await fetch(url2);
    if (res2.ok) {
      const data2 = await res2.json();
      const firstSheet = data2.sheets?.[0]?.properties?.title;
      if (firstSheet) {
        const url3 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(firstSheet)}?key=${SHEETS_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;
        const res3 = await fetch(url3);
        if (res3.ok) {
          const data3 = await res3.json();
          return data3.values || [];
        }
      }
    }
    throw new Error(`Failed to fetch sheet: ${res.status}`);
  }

  const data = await res.json();
  return data.values || [];
}

/* ═══════════════════════════════════════════
   PROCESS & AGGREGATE
   ═══════════════════════════════════════════ */

function processSheetRows(rows: any[][]) {
  if (rows.length < 2) return null;

  const headers = rows[0].map((h: string) => String(h).trim());
  const dataRows = rows.slice(1).filter(r => r.length > 0 && r[0]);

  // Map column indices
  const col = (name: string) => {
    const idx = headers.findIndex((h: string) =>
      h.toLowerCase().includes(name.toLowerCase())
    );
    return idx;
  };

  const iDate = col('Date');
  const iCampaign = col('Campaign');
  const iSpend = col('Spend') !== -1 ? col('Spend') : col('Cost') !== -1 ? col('Cost') : col('Amount');
  const iImpressions = col('Impressions');
  const iClicks = col('Link Click') !== -1 ? col('Link Click') : col('Clicks');
  const iLeads = col('Leads');
  const iAdName = col('Ad Name');
  const iAdset = col('Adset');
  const iLPV = col('Landing Page');
  const iReach = col('Reach');
  const iCPM = col('CPM');
  const iCPC = headers.findIndex((h: string) => h.toLowerCase().includes('cpc'));
  const iPurchase = col('Purchase');

  // Aggregated totals
  let totalSpend = 0, totalImpressions = 0, totalClicks = 0, totalLeads = 0;
  let totalLPV = 0, totalReach = 0, totalPurchases = 0;

  // Daily aggregation
  const dailyMap: Record<string, any> = {};

  // Ad aggregation
  const adMap: Record<string, any> = {};

  // Adset/audience aggregation
  const audienceMap: Record<string, any> = {};

  // Campaign/etapa aggregation
  const etapaMap: Record<string, any> = {};

  // Quente vs Frio
  let leadsQuentes = 0, leadsFrios = 0;
  let spendQuente = 0, spendFrio = 0;

  for (const row of dataRows) {
    const date = row[iDate] ? String(row[iDate]) : '';
    const campaign = row[iCampaign] ? String(row[iCampaign]) : '';
    const spend = parseNumber(row[iSpend]);
    const impressions = parseNumber(row[iImpressions]);
    const clicks = parseNumber(row[iClicks]);
    const leads = parseNumber(row[iLeads]);
    const lpv = iLPV !== -1 ? parseNumber(row[iLPV]) : 0;
    const reach = iReach !== -1 ? parseNumber(row[iReach]) : 0;
    const purchases = iPurchase !== -1 ? parseNumber(row[iPurchase]) : 0;
    const adName = iAdName !== -1 && row[iAdName] ? String(row[iAdName]) : '';
    const adset = iAdset !== -1 && row[iAdset] ? String(row[iAdset]) : '';

    totalSpend += spend;
    totalImpressions += impressions;
    totalClicks += clicks;
    totalLeads += leads;
    totalLPV += lpv;
    totalReach += reach;
    totalPurchases += purchases;

    // Temperature
    const temp = getAudienceTemp(adset);
    if (temp === 'Quente') { leadsQuentes += leads; spendQuente += spend; }
    else { leadsFrios += leads; spendFrio += spend; }

    // Format date for display
    const dateKey = date.includes('-')
      ? date.split('-').slice(1).reverse().join('/')
      : date;

    // Daily
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, leads: 0, investimento: 0, impressions: 0, cliques: 0, cpl: 0, ctr: 0, cpc: 0, lpv: 0 };
    }
    dailyMap[dateKey].leads += leads;
    dailyMap[dateKey].investimento += spend;
    dailyMap[dateKey].impressions += impressions;
    dailyMap[dateKey].cliques += clicks;
    dailyMap[dateKey].lpv += lpv;

    // Ads
    if (adName) {
      if (!adMap[adName]) {
        adMap[adName] = { name: adName, type: getAdType(adName), platform: 'meta', investimento: 0, leads: 0, impressions: 0, cliques: 0, cpl: 0, ctr: 0, cpm: 0, cpc: 0, roas: 0 };
      }
      adMap[adName].investimento += spend;
      adMap[adName].leads += leads;
      adMap[adName].impressions += impressions;
      adMap[adName].cliques += clicks;
    }

    // Audiences
    if (adset) {
      if (!audienceMap[adset]) {
        audienceMap[adset] = { name: adset, temperature: temp, investimento: 0, leads: 0, impressions: 0, cliques: 0, cpl: 0, ctr: 0, roas: 0 };
      }
      audienceMap[adset].investimento += spend;
      audienceMap[adset].leads += leads;
      audienceMap[adset].impressions += impressions;
      audienceMap[adset].cliques += clicks;
    }

    // Etapa
    const parsed = parseCampaignName(campaign);
    if (parsed) {
      const key = parsed.etapa;
      if (!etapaMap[key]) {
        etapaMap[key] = { name: key, investimento: 0, leads: 0, impressions: 0 };
      }
      etapaMap[key].investimento += spend;
      etapaMap[key].leads += leads;
      etapaMap[key].impressions += impressions;
    }
  }

  // Calculate derived metrics for daily
  const daily = Object.values(dailyMap).sort((a: any, b: any) => {
    const [dA, mA] = a.date.split('/');
    const [dB, mB] = b.date.split('/');
    return (parseInt(mA || '0') * 100 + parseInt(dA || '0')) - (parseInt(mB || '0') * 100 + parseInt(dB || '0'));
  });
  for (const d of daily) {
    d.cpl = d.leads > 0 ? d.investimento / d.leads : 0;
    d.ctr = d.impressions > 0 ? (d.cliques / d.impressions) * 100 : 0;
    d.cpc = d.cliques > 0 ? d.investimento / d.cliques : 0;
  }

  // Calculate derived metrics for ads
  const ads = Object.values(adMap);
  for (const a of ads) {
    a.cpl = a.leads > 0 ? a.investimento / a.leads : 0;
    a.ctr = a.impressions > 0 ? (a.cliques / a.impressions) * 100 : 0;
    a.cpm = a.impressions > 0 ? (a.investimento / a.impressions) * 1000 : 0;
    a.cpc = a.cliques > 0 ? a.investimento / a.cliques : 0;
  }

  // Calculate derived metrics for audiences
  const audiences = Object.values(audienceMap);
  for (const a of audiences) {
    a.cpl = a.leads > 0 ? a.investimento / a.leads : 0;
    a.ctr = a.impressions > 0 ? (a.cliques / a.impressions) * 100 : 0;
  }

  // Global metrics
  const cpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const txCarregamento = totalClicks > 0 ? (totalLPV / totalClicks) * 100 : 0;
  const txConversao = totalLPV > 0 ? (totalLeads / totalLPV) * 100 : (totalClicks > 0 ? (totalLeads / totalClicks) * 100 : 0);
  const cplQuente = leadsQuentes > 0 ? spendQuente / leadsQuentes : 0;
  const cplFrio = leadsFrios > 0 ? spendFrio / leadsFrios : 0;

  // Budget by etapa
  const budgets: Record<string, number> = {};
  for (const [key, val] of Object.entries(etapaMap) as any) {
    const lower = key.toLowerCase();
    if (lower.includes('captacao')) budgets.captacao = (budgets.captacao || 0) + val.investimento;
    else if (lower.includes('aquecimento') || lower.includes('esquenta')) budgets.aquecimento = (budgets.aquecimento || 0) + val.investimento;
    else if (lower.includes('lembrete')) budgets.lembrete = (budgets.lembrete || 0) + val.investimento;
    else if (lower.includes('cpl')) budgets.cpls = (budgets.cpls || 0) + val.investimento;
    else if (lower.includes('carrinho') || lower.includes('remarketing') || lower.includes('rmkt')) budgets.carrinho = (budgets.carrinho || 0) + val.investimento;
    else budgets.captacao = (budgets.captacao || 0) + val.investimento;
  }

  return {
    // Totals
    investimento: Math.round(totalSpend * 100) / 100,
    leads_total: totalLeads,
    cpl: Math.round(cpl * 100) / 100,
    impressions: totalImpressions,
    alcance: totalReach,
    cliques: totalClicks,
    page_views: totalLPV,
    ctr: Math.round(ctr * 100) / 100,
    cpc: Math.round(cpc * 100) / 100,
    cpm: Math.round(cpm * 100) / 100,
    tx_carregamento: Math.round(txCarregamento * 100) / 100,
    tx_conversao: Math.round(txConversao * 100) / 100,

    // Quente/Frio
    leads_quentes: leadsQuentes,
    leads_frios: leadsFrios,
    cpl_quente: Math.round(cplQuente * 100) / 100,
    cpl_frio: Math.round(cplFrio * 100) / 100,
    invest_quente: Math.round(spendQuente * 100) / 100,
    invest_frio: Math.round(spendFrio * 100) / 100,

    // Budget by etapa (realizado)
    realizado_captacao: Math.round((budgets.captacao || 0) * 100) / 100,
    realizado_aquecimento: Math.round((budgets.aquecimento || 0) * 100) / 100,
    realizado_lembrete: Math.round((budgets.lembrete || 0) * 100) / 100,
    realizado_cpls: Math.round((budgets.cpls || 0) * 100) / 100,
    realizado_carrinho: Math.round((budgets.carrinho || 0) * 100) / 100,

    // JSON arrays
    daily_data: daily,
    ads_data: ads,
    audiences_data: audiences,

    // Creatives by platform (for Mega template)
    creatives_fb: ads.map(a => ({ ...a, temperature: 'Misto' })),
  };
}

/* ═══════════════════════════════════════════
   API ROUTE
   ═══════════════════════════════════════════ */

export async function POST(req: NextRequest) {
  try {
    const { dashboard_id } = await req.json();

    if (!SHEETS_API_KEY) {
      return NextResponse.json({ error: 'Google Sheets API key not configured' }, { status: 500 });
    }

    // Get dashboard with sheet URL
    const { data: dash, error } = await supabase
      .from('client_dashboards')
      .select('*')
      .eq('id', dashboard_id)
      .single();

    if (error || !dash) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    if (!dash.sheet_url) {
      return NextResponse.json({ error: 'No Google Sheets URL configured for this dashboard' }, { status: 400 });
    }

    const spreadsheetId = extractSpreadsheetId(dash.sheet_url);
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL' }, { status: 400 });
    }

    // Fetch data
    const rows = await fetchSheetData(spreadsheetId, dash.sheet_tab || undefined);
    const metrics = processSheetRows(rows);

    if (!metrics) {
      return NextResponse.json({ error: 'No data found in sheet' }, { status: 400 });
    }

    // Update dashboard
    const { error: updateError } = await supabase
      .from('client_dashboards')
      .update({
        ...metrics,
        last_sync: new Date().toISOString(),
      })
      .eq('id', dashboard_id);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update dashboard: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leads: metrics.leads_total,
      investimento: metrics.investimento,
      daily_count: metrics.daily_data.length,
      ads_count: metrics.ads_data.length,
      last_sync: new Date().toISOString(),
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
  }
}

// GET endpoint for cron job — syncs ALL dashboards that have sheet_url
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SHEETS_API_KEY) {
      return NextResponse.json({ error: 'Google Sheets API key not configured' }, { status: 500 });
    }

    // Get all dashboards with sheet URLs
    const { data: dashes } = await supabase
      .from('client_dashboards')
      .select('id, sheet_url, sheet_tab, title')
      .not('sheet_url', 'is', null)
      .neq('sheet_url', '');

    if (!dashes || dashes.length === 0) {
      return NextResponse.json({ message: 'No dashboards with sheets configured', synced: 0 });
    }

    const results = [];

    for (const dash of dashes) {
      try {
        const spreadsheetId = extractSpreadsheetId(dash.sheet_url);
        if (!spreadsheetId) { results.push({ id: dash.id, title: dash.title, error: 'Invalid URL' }); continue; }

        const rows = await fetchSheetData(spreadsheetId, dash.sheet_tab || undefined);
        const metrics = processSheetRows(rows);

        if (!metrics) { results.push({ id: dash.id, title: dash.title, error: 'No data' }); continue; }

        await supabase.from('client_dashboards').update({ ...metrics, last_sync: new Date().toISOString() }).eq('id', dash.id);

        results.push({ id: dash.id, title: dash.title, success: true, leads: metrics.leads_total });
      } catch (err: any) {
        results.push({ id: dash.id, title: dash.title, error: err.message });
      }
    }

    return NextResponse.json({ synced: results.filter(r => r.success).length, total: dashes.length, results });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
