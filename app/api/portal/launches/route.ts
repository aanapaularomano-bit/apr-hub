import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPortalToken, portalCookieName } from '@/lib/portalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });

  const token = request.cookies.get(portalCookieName(slug))?.value;
  if (!token || !(await verifyPortalToken(slug, token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { data: portal } = await supabase
    .from('client_portals')
    .select('client_id')
    .eq('slug', slug)
    .single();

  if (!portal) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });

  const launchId = request.nextUrl.searchParams.get('id');

  // Detalhe de um lançamento específico
  if (launchId) {
    const [launchRes, linksRes] = await Promise.all([
      supabase
        .from('portal_launches')
        .select('*, portal_launch_phases(*)')
        .eq('id', launchId)
        .eq('client_id', portal.client_id)
        .single(),
      supabase
        .from('portal_links')
        .select('id, label, url, description, tag')
        .eq('client_id', portal.client_id)
        .eq('launch_id', launchId)
        .order('sort_order'),
    ]);

    if (!launchRes.data) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });

    const launch = {
      ...launchRes.data,
      portal_launch_phases: (launchRes.data.portal_launch_phases || []).sort(
        (a: any, b: any) => a.order_num - b.order_num
      ),
    };

    return NextResponse.json({ launch, links: linksRes.data || [] });
  }

  // Lista de lançamentos
  const { data: launches } = await supabase
    .from('portal_launches')
    .select('id, name, start_date, end_date, status, results, goals, portal_launch_phases(id, name, start_date, end_date, order_num)')
    .eq('client_id', portal.client_id)
    .order('sort_order', { ascending: true })
    .order('start_date', { ascending: false });

  const sorted = (launches || []).map((l: any) => ({
    ...l,
    portal_launch_phases: (l.portal_launch_phases || []).sort(
      (a: any, b: any) => a.order_num - b.order_num
    ),
  }));

  return NextResponse.json({ launches: sorted });
}
