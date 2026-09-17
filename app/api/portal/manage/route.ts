import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, generatePassword, slugify } from '@/lib/portalAuth';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function hubAuth(): boolean {
  const cookieStore = cookies();
  const token = cookieStore.get('apr_auth')?.value;
  return token === (process.env.APR_AUTH_SECRET || 'apr-hub-token');
}

// GET — load portal state for a client
export async function GET(request: NextRequest) {
  if (!hubAuth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('client_id');
  if (!clientId) return NextResponse.json({ error: 'client_id obrigatório' }, { status: 400 });

  const [portalRes, linksRes, requestsRes] = await Promise.all([
    supabase.from('client_portals').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('portal_links').select('*').eq('client_id', clientId).order('sort_order').order('created_at'),
    supabase.from('portal_requests').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    portal: portalRes.data,
    links: linksRes.data || [],
    requests: requestsRes.data || [],
  });
}

// POST — all write actions
export async function POST(request: NextRequest) {
  if (!hubAuth()) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  // ── Criar ou atualizar portal ─────────────────────────────
  if (action === 'upsert_portal') {
    const { client_id, client_name, password } = body;
    const slug = body.slug || slugify(client_name || client_id);
    const hash = await hashPassword(password);

    const { data: existing } = await supabase
      .from('client_portals')
      .select('id')
      .eq('client_id', client_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('client_portals')
        .update({ slug, password_hash: hash, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ portal: data });
    } else {
      const { data, error } = await supabase
        .from('client_portals')
        .insert({ client_id, slug, password_hash: hash })
        .select()
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ portal: data });
    }
  }

  // ── Gerar nova senha ──────────────────────────────────────
  if (action === 'generate_password') {
    const { portal_id } = body;
    const plain = generatePassword();
    const hash = await hashPassword(plain);
    const { error } = await supabase
      .from('client_portals')
      .update({ password_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ password: plain });
  }

  // ── Ativar / desativar ────────────────────────────────────
  if (action === 'toggle_enabled') {
    const { portal_id, enabled } = body;
    const { error } = await supabase
      .from('client_portals')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Atualizar seções visíveis ─────────────────────────────
  if (action === 'update_sections') {
    const { portal_id, sections } = body;
    const { error } = await supabase
      .from('client_portals')
      .update({ sections, updated_at: new Date().toISOString() })
      .eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Links ─────────────────────────────────────────────────
  if (action === 'add_link') {
    const { client_id, group_name, label, url } = body;
    const { data, error } = await supabase
      .from('portal_links')
      .insert({ client_id, group_name, label, url })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ link: data });
  }

  if (action === 'remove_link') {
    const { link_id } = body;
    const { error } = await supabase.from('portal_links').delete().eq('id', link_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Solicitações ──────────────────────────────────────────
  if (action === 'add_request') {
    const { client_id, title, details, due_date } = body;
    const { data, error } = await supabase
      .from('portal_requests')
      .insert({ client_id, from: 'agency', title, details: details || null, due_date: due_date || null })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ request: data });
  }

  if (action === 'update_request') {
    const { request_id, status, note } = body;
    const { error } = await supabase
      .from('portal_requests')
      .update({ status, note: note || null, updated_at: new Date().toISOString() })
      .eq('id', request_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_request') {
    const { request_id } = body;
    const { error } = await supabase.from('portal_requests').delete().eq('id', request_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
