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

const FIELDS = 'id, name, period, status, metrics, content, phases, goals, launch_links, ideas, launch_optimizations, learnings, previous_data, sheet_url, current_phase, created_at';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { data, error } = await sb
    .from('portal_launches')
    .select(FIELDS)
    .eq('client_id', session.clientId)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ launches: data });
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });

  const row = {
    client_id: session.clientId,
    name: body.name,
    period: body.period ?? null,
    status: body.status ?? 'planejamento',
    metrics: body.metrics ?? null,
    content: body.content ?? null,
    phases: body.phases ?? [],
    goals: body.goals ?? [],
    launch_links: body.launch_links ?? [],
    ideas: body.ideas ?? [],
    launch_optimizations: body.launch_optimizations ?? [],
    learnings: body.learnings ?? null,
    previous_data: body.previous_data ?? null,
    sheet_url: body.sheet_url ?? null,
    current_phase: body.current_phase ?? 0,
  };

  const { data, error } = await sb.from('portal_launches').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ launch: data });
}

export async function PUT(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const k of ['name','period','status','metrics','content','phases','goals','launch_links','ideas','launch_optimizations','learnings','previous_data','sheet_url','current_phase']) {
    if (k in body) update[k] = body[k];
  }

  const { data, error } = await sb
    .from('portal_launches')
    .update(update)
    .eq('id', body.id)
    .eq('client_id', session.clientId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ launch: data });
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const id = req.nextUrl.searchParams.get('id');
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await sb
    .from('portal_launches')
    .delete()
    .eq('id', id)
    .eq('client_id', session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
