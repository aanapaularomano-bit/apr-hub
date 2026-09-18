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

const FIELDS = 'id, kind, ref_date, title, content, headline, period_label, author, services, comparison, verdict, suggestions, next_plan, sheet_url, created_at';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const kind = req.nextUrl.searchParams.get('kind');
  const session = await auth(req, slug);
  if (!session) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  let query = sb
    .from('portal_reports')
    .select(FIELDS)
    .eq('client_id', session.clientId)
    .order('ref_date', { ascending: false });
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reports: data });
}

export async function POST(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (!body.kind || !body.ref_date || !body.title)
    return NextResponse.json({ error: 'Campos obrigatórios: kind, ref_date, title' }, { status: 400 });

  const row: Record<string, unknown> = { client_id: session.clientId };
  for (const k of ['kind','ref_date','title','content','headline','period_label','author','services','comparison','verdict','suggestions','next_plan','sheet_url']) {
    if (k in body) row[k] = body[k] ?? null;
  }

  const { data, error } = await sb.from('portal_reports').insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}

export async function PUT(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const k of ['kind','ref_date','title','content','headline','period_label','author','services','comparison','verdict','suggestions','next_plan','sheet_url']) {
    if (k in body) update[k] = body[k];
  }

  const { data, error } = await sb
    .from('portal_reports')
    .update(update)
    .eq('id', body.id)
    .eq('client_id', session.clientId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ report: data });
}

export async function DELETE(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const id = req.nextUrl.searchParams.get('id');
  const session = await auth(req, slug);
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const { error } = await sb
    .from('portal_reports')
    .delete()
    .eq('id', id)
    .eq('client_id', session.clientId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
