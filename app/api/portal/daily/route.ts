import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPortalToken, portalCookieName } from '@/lib/portalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getPortalClientId(slug: string): Promise<string | null> {
  const { data } = await supabase
    .from('client_portals')
    .select('client_id')
    .eq('slug', slug)
    .single();
  return data?.client_id ?? null;
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });

  const token = request.cookies.get(portalCookieName(slug))?.value;
  if (!token || !(await verifyPortalToken(slug, token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const clientId = await getPortalClientId(slug);
  if (!clientId) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });

  const date = request.nextUrl.searchParams.get('date');

  // Sem date → retorna lista de datas com relatório publicado
  if (!date) {
    const { data } = await supabase
      .from('portal_daily_reports')
      .select('date')
      .eq('client_id', clientId)
      .eq('published', true)
      .order('date', { ascending: false });

    return NextResponse.json({ dates: (data || []).map((r: any) => r.date) });
  }

  // Com date → retorna relatório completo + atividades + pendências
  const [reportRes, activitiesRes, requestsRes] = await Promise.all([
    supabase
      .from('portal_daily_reports')
      .select('*')
      .eq('client_id', clientId)
      .eq('date', date)
      .eq('published', true)
      .maybeSingle(),
    supabase
      .from('portal_activities')
      .select('id, title, responsible, status, justification, sort_order')
      .eq('client_id', clientId)
      .eq('date', date)
      .eq('visible_to_client', true)
      .order('sort_order'),
    supabase
      .from('portal_requests')
      .select('id, title, from, due_date, created_at')
      .eq('client_id', clientId)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (!reportRes.data) {
    return NextResponse.json({ error: 'Relatório não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    report: reportRes.data,
    activities: activitiesRes.data || [],
    pending_requests: requestsRes.data || [],
  });
}
