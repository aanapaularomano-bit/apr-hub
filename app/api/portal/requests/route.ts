import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPortalToken, portalCookieName } from '@/lib/portalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getClientId(slug: string): Promise<string | null> {
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

  const clientId = await getClientId(slug);
  if (!clientId) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });

  const { data: requests } = await supabase
    .from('portal_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  return NextResponse.json({ requests: requests || [] });
}

export async function POST(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 });

  const token = request.cookies.get(portalCookieName(slug))?.value;
  if (!token || !(await verifyPortalToken(slug, token))) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const clientId = await getClientId(slug);
  if (!clientId) return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });

  const { title, details } = await request.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });

  const { data, error } = await supabase
    .from('portal_requests')
    .insert({ client_id: clientId, from: 'client', title: title.trim(), details: details?.trim() || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ request: data });
}
