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

  const { data: links } = await supabase
    .from('portal_links')
    .select('*')
    .eq('client_id', portal.client_id)
    .order('sort_order')
    .order('created_at');

  return NextResponse.json({ links: links || [] });
}
