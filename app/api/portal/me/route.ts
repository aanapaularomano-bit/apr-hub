import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPortalRole, portalCookieName } from '@/lib/portalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });

  const token = request.cookies.get(portalCookieName(slug))?.value;
  const role = token ? await getPortalRole(slug, token) : null;
  if (!role) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data: portal } = await supabase
    .from('client_portals')
    .select('id, client_id, slug, enabled, clients(id, name)')
    .eq('slug', slug)
    .single();

  if (!portal || !portal.enabled) {
    return NextResponse.json({ error: 'Portal inativo' }, { status: 403 });
  }

  return NextResponse.json({ role, portal });
}
