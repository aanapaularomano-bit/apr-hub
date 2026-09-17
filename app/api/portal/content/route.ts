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
    .from('client_portals').select('client_id').eq('slug', slug).single();
  if (!portal) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });

  const { data } = await supabase
    .from('portal_content')
    .select('id, name, format, send_date, status, metrics, notes, sort_order')
    .eq('client_id', portal.client_id)
    .eq('visible_to_client', true)
    .order('send_date', { ascending: true })
    .order('sort_order');

  return NextResponse.json({ content: data || [] });
}
