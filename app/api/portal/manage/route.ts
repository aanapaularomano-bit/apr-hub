import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, generatePassword, slugify } from '@/lib/portalAuth';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function hubAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('apr_auth')?.value;
  return token === (process.env.APR_AUTH_SECRET || 'apr-hub-token');
}

// GET — load portal state for a client
export async function GET(request: NextRequest) {
  if (!(await hubAuth())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('client_id');
  if (!clientId) return NextResponse.json({ error: 'client_id obrigatório' }, { status: 400 });

  const section = request.nextUrl.searchParams.get('section');

  // Partial load for specific sections
  if (section === 'activities') {
    const date = request.nextUrl.searchParams.get('date');
    let q = supabase.from('portal_activities').select('*').eq('client_id', clientId).order('sort_order');
    if (date) q = q.eq('date', date); else q = q.order('date', { ascending: false }).limit(60);
    const { data } = await q;
    return NextResponse.json({ activities: data || [] });
  }

  if (section === 'daily') {
    const date = request.nextUrl.searchParams.get('date');
    if (date) {
      const { data } = await supabase.from('portal_daily_reports').select('*').eq('client_id', clientId).eq('date', date).maybeSingle();
      return NextResponse.json({ report: data });
    }
    const { data } = await supabase.from('portal_daily_reports').select('*').eq('client_id', clientId).order('date', { ascending: false }).limit(30);
    return NextResponse.json({ reports: data || [] });
  }

  if (section === 'launches') {
    const launchId = request.nextUrl.searchParams.get('launch_id');
    if (launchId) {
      const [launchRes, linksRes] = await Promise.all([
        supabase.from('portal_launches').select('*, portal_launch_phases(*)').eq('id', launchId).eq('client_id', clientId).single(),
        supabase.from('portal_links').select('*').eq('client_id', clientId).eq('launch_id', launchId).order('sort_order'),
      ]);
      const launch = launchRes.data ? {
        ...launchRes.data,
        portal_launch_phases: (launchRes.data.portal_launch_phases || []).sort((a: any, b: any) => a.order_num - b.order_num),
      } : null;
      return NextResponse.json({ launch, links: linksRes.data || [] });
    }
    const { data } = await supabase
      .from('portal_launches')
      .select('*, portal_launch_phases(id, name, start_date, end_date, order_num)')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true })
      .order('start_date', { ascending: false });
    const launches = (data || []).map((l: any) => ({
      ...l,
      portal_launch_phases: (l.portal_launch_phases || []).sort((a: any, b: any) => a.order_num - b.order_num),
    }));
    return NextResponse.json({ launches });
  }

  const [portalRes, linksRes, requestsRes] = await Promise.all([
    supabase.from('client_portals').select('*').eq('client_id', clientId).maybeSingle(),
    supabase.from('portal_links').select('*').eq('client_id', clientId).is('launch_id', null).order('sort_order').order('created_at'),
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
  if (!(await hubAuth())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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

  // ── Atualizar link ────────────────────────────────────────
  if (action === 'update_link') {
    const { link_id, group_name, label, url, description, tag, visible_to_client, sort_order } = body;
    const { error } = await supabase
      .from('portal_links')
      .update({ group_name, label, url, description: description ?? null, tag: tag ?? null, visible_to_client, sort_order })
      .eq('id', link_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Adicionar vários links de uma vez ─────────────────────
  if (action === 'bulk_add_links') {
    const { client_id, links } = body;
    const rows = (links as any[]).map((l: any) => ({
      client_id,
      group_name: l.group_name || 'Referências',
      label: l.label,
      url: l.url,
      description: l.description ?? null,
      tag: l.tag ?? null,
      visible_to_client: l.visible_to_client !== false,
      launch_id: l.launch_id ?? null,
    }));
    const { data, error } = await supabase.from('portal_links').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ links: data });
  }

  // ── Relatório diário ──────────────────────────────────────
  if (action === 'upsert_daily_report') {
    const { client_id, date, metrics, note, published } = body;
    const { data, error } = await supabase
      .from('portal_daily_reports')
      .upsert(
        { client_id, date, metrics: metrics ?? {}, note: note ?? null, published: published ?? false, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,date' }
      )
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ report: data });
  }

  if (action === 'publish_daily_report') {
    const { report_id, published } = body;
    const { error } = await supabase
      .from('portal_daily_reports')
      .update({ published, updated_at: new Date().toISOString() })
      .eq('id', report_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Atividades ────────────────────────────────────────────
  if (action === 'add_activity') {
    const { client_id, date, title, responsible, status, justification, sort_order, visible_to_client } = body;
    const { data, error } = await supabase
      .from('portal_activities')
      .insert({
        client_id, date, title,
        responsible: responsible || 'agency',
        status: status || 'todo',
        justification: justification ?? null,
        sort_order: sort_order ?? 0,
        visible_to_client: visible_to_client !== false,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ activity: data });
  }

  if (action === 'update_activity') {
    const { activity_id, title, responsible, status, justification, sort_order, visible_to_client } = body;
    const { error } = await supabase
      .from('portal_activities')
      .update({ title, responsible, status, justification: justification ?? null, sort_order, visible_to_client, updated_at: new Date().toISOString() })
      .eq('id', activity_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_activity') {
    const { activity_id } = body;
    const { error } = await supabase.from('portal_activities').delete().eq('id', activity_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Lançamentos ───────────────────────────────────────────
  if (action === 'add_launch') {
    const { client_id, name, start_date, end_date, status, goals, results, debrief, sort_order } = body;
    const { data, error } = await supabase
      .from('portal_launches')
      .insert({
        client_id, name,
        start_date: start_date ?? null,
        end_date: end_date ?? null,
        status: status || 'planejamento',
        goals: goals ?? {},
        results: results ?? {},
        debrief: debrief ?? {},
        sort_order: sort_order ?? 0,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ launch: data });
  }

  if (action === 'update_launch') {
    const { launch_id, name, start_date, end_date, status, goals, results, debrief, sort_order } = body;
    const { error } = await supabase
      .from('portal_launches')
      .update({ name, start_date: start_date ?? null, end_date: end_date ?? null, status, goals, results, debrief, sort_order, updated_at: new Date().toISOString() })
      .eq('id', launch_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_launch') {
    const { launch_id } = body;
    const { error } = await supabase.from('portal_launches').delete().eq('id', launch_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Fases de lançamento ───────────────────────────────────
  if (action === 'add_launch_phase') {
    const { launch_id, name, start_date, end_date, order_num } = body;
    const { data, error } = await supabase
      .from('portal_launch_phases')
      .insert({ launch_id, name, start_date: start_date ?? null, end_date: end_date ?? null, order_num: order_num ?? 0 })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ phase: data });
  }

  if (action === 'update_launch_phase') {
    const { phase_id, name, start_date, end_date, order_num } = body;
    const { error } = await supabase
      .from('portal_launch_phases')
      .update({ name, start_date: start_date ?? null, end_date: end_date ?? null, order_num })
      .eq('id', phase_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_launch_phase') {
    const { phase_id } = body;
    const { error } = await supabase.from('portal_launch_phases').delete().eq('id', phase_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
}
