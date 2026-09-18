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
    .from('portal_ideas')
    .select('id, title, description, created_at')
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ideas: data });
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { title, description } = await req.json();
  if (!title) return NextResponse.json({ error: 'title obrigatório' }, { status: 400 });

  const { data, error } = await sb
    .from('portal_ideas')
    .insert({ client_id: session.clientId, title, description: description ?? null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idea: data });
}

export async function PUT(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const { id, title, description } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { data, error } = await sb
    .from('portal_ideas')
    .update({ title, description })
    .eq('id', id)
    .eq('client_id', session.clientId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idea: data });
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const id = req.nextUrl.searchParams.get('id');
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await sb
    .from('portal_ideas')
    .delete()
    .eq('id', id)
    .eq('client_id', session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
