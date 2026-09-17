import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPortalRole, portalCookieName } from '@/lib/portalAuth';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function auth(req: NextRequest, slug: string) {
  const token = req.cookies.get(portalCookieName(slug))?.value;
  if (!token) return null;
  const role = await getPortalRole(slug, token);
  if (!role) return null;
  const { data } = await sb.from('client_portals').select('client_id').eq('slug', slug).single();
  return data ? { clientId: data.client_id as string, role } : null;
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data, error } = await sb
    .from('portal_links')
    .select('id, group_name, label, url, created_at')
    .eq('client_id', session.clientId)
    .order('group_name')
    .order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ links: data });
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { group_name, label, url } = await req.json();
  if (!group_name || !label || !url)
    return NextResponse.json({ error: 'group_name, label e url obrigatórios' }, { status: 400 });

  const { data, error } = await sb
    .from('portal_links')
    .insert({ client_id: session.clientId, group_name, label, url })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

export async function PUT(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id, group_name, label, url } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { data, error } = await sb
    .from('portal_links')
    .update({ group_name, label, url })
    .eq('id', id)
    .eq('client_id', session.clientId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ link: data });
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const id = req.nextUrl.searchParams.get('id');
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await sb
    .from('portal_links')
    .delete()
    .eq('id', id)
    .eq('client_id', session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
