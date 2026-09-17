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

  const cookieName = portalCookieName(slug);
  const token = request.cookies.get(cookieName)?.value;
  if (!token || !(await verifyPortalToken(slug, token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { data: portal } = await supabase
    .from('client_portals')
    .select('id, client_id, slug, enabled, sections, clients(id, name, squad, niche, product)')
    .eq('slug', slug)
    .single();

  if (!portal || !portal.enabled) {
    return NextResponse.json({ error: 'Portal inativo' }, { status: 403 });
  }

  return NextResponse.json({ portal });
}
