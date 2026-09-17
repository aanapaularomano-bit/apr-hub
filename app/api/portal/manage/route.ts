import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword, generatePassword, slugify } from '@/lib/portalAuth';
import { logActivity } from '@/lib/portalLog';
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

// ── GET ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await hubAuth())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const clientId = request.nextUrl.searchParams.get('client_id');
  if (!clientId) return NextResponse.json({ error: 'client_id obrigatório' }, { status: 400 });

  const section = request.nextUrl.searchParams.get('section');

  if (section === 'activities') {
    const date = request.nextUrl.searchParams.get('date');
    let q = supabase.from('portal_activities').select('*').eq('client_id', clientId).order('sort_order');
    if (date) q = q.eq('date', date); else q = q.order('date', { ascending: false }).limit(90);
    const { data } = await q;
    return NextResponse.json({ activities: data || [] });
  }

  if (section === 'daily') {
    const date = request.nextUrl.searchParams.get('date');
    if (date) {
      const { data } = await supabase.from('portal_daily_reports').select('*')
        .eq('client_id', clientId).eq('date', date).maybeSingle();
      return NextResponse.json({ report: data });
    }
    const { data } = await supabase.from('portal_daily_reports').select('*')
      .eq('client_id', clientId).order('date', { ascending: false }).limit(60);
    return NextResponse.json({ reports: data || [] });
  }

  if (section === 'weekly') {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const { data } = await supabase.from('portal_weekly_reports').select('*')
        .eq('id', id).eq('client_id', clientId).maybeSingle();
      return NextResponse.json({ report: data });
    }
    const { data } = await supabase.from('portal_weekly_reports').select('*')
      .eq('client_id', clientId).order('week_start', { ascending: false }).limit(52);
    return NextResponse.json({ reports: data || [] });
  }

  if (section === 'monthly') {
    const id = request.nextUrl.searchParams.get('id');
    if (id) {
      const { data } = await supabase.from('portal_monthly_reports').select('*')
        .eq('id', id).eq('client_id', clientId).maybeSingle();
      return NextResponse.json({ report: data });
    }
    const { data } = await supabase.from('portal_monthly_reports').select('*')
      .eq('client_id', clientId).order('month_key', { ascending: false }).limit(24);
    return NextResponse.json({ reports: data || [] });
  }

  if (section === 'optimizations') {
    const date = request.nextUrl.searchParams.get('date');
    let q = supabase.from('portal_optimizations').select('*').eq('client_id', clientId)
      .order('date', { ascending: false }).order('sort_order');
    if (date) q = q.eq('date', date);
    const { data } = await q;
    return NextResponse.json({ optimizations: data || [] });
  }

  if (section === 'content') {
    const { data } = await supabase.from('portal_content').select('*')
      .eq('client_id', clientId).order('send_date', { ascending: true }).order('sort_order');
    return NextResponse.json({ content: data || [] });
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
    const { data } = await supabase.from('portal_launches')
      .select('*, portal_launch_phases(id, name, start_date, end_date, order_num)')
      .eq('client_id', clientId).order('sort_order', { ascending: true }).order('start_date', { ascending: false });
    const launches = (data || []).map((l: any) => ({
      ...l,
      portal_launch_phases: (l.portal_launch_phases || []).sort((a: any, b: any) => a.order_num - b.order_num),
    }));
    return NextResponse.json({ launches });
  }

  if (section === 'history') {
    const entity = request.nextUrl.searchParams.get('entity');
    const from = request.nextUrl.searchParams.get('from');
    const to = request.nextUrl.searchParams.get('to');
    let q = supabase.from('portal_activity_log').select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(200);
    if (entity) q = q.eq('entity', entity);
    if (from) q = q.gte('created_at', from);
    if (to) q = q.lte('created_at', to + 'T23:59:59Z');
    const { data } = await q;
    return NextResponse.json({ log: data || [] });
  }

  // Default: portal config + links + requests
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

// ── POST ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!(await hubAuth())) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  // ── Portal config ─────────────────────────────────────────
  if (action === 'upsert_portal') {
    const { client_id, client_name, password } = body;
    const slug = body.slug || slugify(client_name || client_id);
    const hash = await hashPassword(password);
    const { data: existing } = await supabase.from('client_portals').select('id').eq('client_id', client_id).maybeSingle();
    if (existing) {
      const { data, error } = await supabase.from('client_portals')
        .update({ slug, password_hash: hash, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ portal: data });
    }
    const { data, error } = await supabase.from('client_portals')
      .insert({ client_id, slug, password_hash: hash }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ portal: data });
  }

  if (action === 'generate_password') {
    const { portal_id } = body;
    const plain = generatePassword();
    const hash = await hashPassword(plain);
    const { error } = await supabase.from('client_portals')
      .update({ password_hash: hash, updated_at: new Date().toISOString() }).eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ password: plain });
  }

  if (action === 'toggle_enabled') {
    const { portal_id, enabled } = body;
    const { error } = await supabase.from('client_portals')
      .update({ enabled, updated_at: new Date().toISOString() }).eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === 'update_sections') {
    const { portal_id, sections } = body;
    const { error } = await supabase.from('client_portals')
      .update({ sections, updated_at: new Date().toISOString() }).eq('id', portal_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Links ─────────────────────────────────────────────────
  if (action === 'add_link') {
    const { client_id, group_name, label, url, description, tag, visible_to_client, launch_id } = body;
    const { data, error } = await supabase.from('portal_links')
      .insert({ client_id, group_name, label, url, description: description ?? null, tag: tag ?? null, visible_to_client: visible_to_client !== false, launch_id: launch_id ?? null })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'link', entity_id: data.id, action: 'created', new_value: label });
    return NextResponse.json({ link: data });
  }

  if (action === 'update_link') {
    const { link_id, client_id, group_name, label, url, description, tag, visible_to_client, sort_order } = body;
    const { error } = await supabase.from('portal_links')
      .update({ group_name, label, url, description: description ?? null, tag: tag ?? null, visible_to_client, sort_order })
      .eq('id', link_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'link', entity_id: link_id, action: 'updated' });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_link') {
    const { link_id, client_id } = body;
    const { error } = await supabase.from('portal_links').delete().eq('id', link_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'link', entity_id: link_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  if (action === 'reorder_links') {
    const { items } = body; // [{id, sort_order}]
    await Promise.all((items as any[]).map((item: any) =>
      supabase.from('portal_links').update({ sort_order: item.sort_order }).eq('id', item.id)
    ));
    return NextResponse.json({ success: true });
  }

  if (action === 'bulk_add_links') {
    const { client_id, links } = body;
    const rows = (links as any[]).map((l: any) => ({
      client_id, group_name: l.group_name || 'Referências', label: l.label, url: l.url,
      description: l.description ?? null, tag: l.tag ?? null,
      visible_to_client: l.visible_to_client !== false, launch_id: l.launch_id ?? null,
    }));
    const { data, error } = await supabase.from('portal_links').insert(rows).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'link', action: 'bulk_created', new_value: `${rows.length} links` });
    return NextResponse.json({ links: data });
  }

  // ── Requests ──────────────────────────────────────────────
  if (action === 'add_request') {
    const { client_id, title, details, due_date } = body;
    const { data, error } = await supabase.from('portal_requests')
      .insert({ client_id, from: 'agency', title, details: details || null, due_date: due_date || null })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'request', entity_id: data.id, action: 'created', new_value: title });
    return NextResponse.json({ request: data });
  }

  if (action === 'update_request') {
    const { request_id, client_id, title, details, due_date, status, note } = body;
    const { error } = await supabase.from('portal_requests')
      .update({ title, details: details ?? null, due_date: due_date ?? null, status, note: note ?? null, updated_at: new Date().toISOString() })
      .eq('id', request_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'request', entity_id: request_id, action: 'updated', field: 'status', new_value: status });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_request') {
    const { request_id, client_id } = body;
    const { error } = await supabase.from('portal_requests').delete().eq('id', request_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'request', entity_id: request_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  // ── Activities ────────────────────────────────────────────
  if (action === 'add_activity') {
    const { client_id, date, title, responsible, status, justification, sort_order, visible_to_client } = body;
    const { data, error } = await supabase.from('portal_activities')
      .insert({ client_id, date, title, responsible: responsible || 'agency', status: status || 'todo',
        justification: justification ?? null, sort_order: sort_order ?? 0, visible_to_client: visible_to_client !== false })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'activity', entity_id: data.id, action: 'created', new_value: title });
    return NextResponse.json({ activity: data });
  }

  if (action === 'update_activity') {
    const { activity_id, client_id, title, responsible, status, justification, sort_order, visible_to_client, date } = body;
    const { error } = await supabase.from('portal_activities')
      .update({ title, responsible, status, justification: justification ?? null, sort_order, visible_to_client, date, updated_at: new Date().toISOString() })
      .eq('id', activity_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'activity', entity_id: activity_id, action: 'updated', field: 'status', new_value: status });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_activity') {
    const { activity_id, client_id } = body;
    const { error } = await supabase.from('portal_activities').delete().eq('id', activity_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'activity', entity_id: activity_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  if (action === 'duplicate_activity') {
    const { activity_id, client_id, new_date } = body;
    const { data: src } = await supabase.from('portal_activities').select('*').eq('id', activity_id).single();
    if (!src) return NextResponse.json({ error: 'Atividade não encontrada' }, { status: 404 });
    const { data, error } = await supabase.from('portal_activities')
      .insert({ client_id: src.client_id, date: new_date || src.date, title: src.title,
        responsible: src.responsible, status: 'todo', justification: null,
        sort_order: src.sort_order, visible_to_client: src.visible_to_client })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id: client_id || src.client_id, entity: 'activity', entity_id: data.id, action: 'created', new_value: `duplicada de ${src.title}` });
    return NextResponse.json({ activity: data });
  }

  // ── Daily reports ─────────────────────────────────────────
  if (action === 'upsert_daily_report') {
    const { client_id, date, metrics, note, published } = body;
    const { data, error } = await supabase.from('portal_daily_reports')
      .upsert({ client_id, date, metrics: metrics ?? {}, note: note ?? null, published: published ?? false, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,date' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'daily_report', entity_id: data.id, action: 'updated', new_value: date });
    return NextResponse.json({ report: data });
  }

  if (action === 'publish_daily_report') {
    const { report_id, client_id, published } = body;
    const { error } = await supabase.from('portal_daily_reports')
      .update({ published, updated_at: new Date().toISOString() }).eq('id', report_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'daily_report', entity_id: report_id, action: published ? 'published' : 'unpublished' });
    return NextResponse.json({ success: true });
  }

  if (action === 'duplicate_daily_report') {
    const { client_id, target_date } = body;
    const { data: prev } = await supabase.from('portal_daily_reports').select('*')
      .eq('client_id', client_id).lt('date', target_date).order('date', { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({ source: prev ?? null });
  }

  if (action === 'auto_build_daily') {
    const { client_id, date } = body;
    const [actRes, optRes] = await Promise.all([
      supabase.from('portal_activities').select('title, status').eq('client_id', client_id).eq('date', date).order('sort_order'),
      supabase.from('portal_optimizations').select('type, campaign, what_done').eq('client_id', client_id).eq('date', date).order('sort_order'),
    ]);
    const STATUS_PT: Record<string, string> = { todo: 'a fazer', doing: 'em andamento', done: 'feito', not_done: 'não feito' };
    const lines: string[] = [];
    if (actRes.data?.length) {
      lines.push('ATIVIDADES');
      actRes.data.forEach((a: any) => lines.push(`- ${a.title} (${STATUS_PT[a.status] ?? a.status})`));
    }
    if (optRes.data?.length) {
      if (lines.length) lines.push('');
      lines.push('OTIMIZAÇÕES');
      optRes.data.forEach((o: any) => {
        const prefix = [o.type, o.campaign].filter(Boolean).join(' / ');
        lines.push(`- ${prefix ? prefix + ': ' : ''}${o.what_done}`);
      });
    }
    return NextResponse.json({ note: lines.join('\n') || '' });
  }

  // ── Weekly reports ────────────────────────────────────────
  if (action === 'upsert_weekly_report') {
    const { client_id, week_start, week_end, metrics, highlights, note, published } = body;
    const { data, error } = await supabase.from('portal_weekly_reports')
      .upsert({ client_id, week_start, week_end: week_end ?? null, metrics: metrics ?? {}, highlights: highlights ?? null, note: note ?? null, published: published ?? false, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,week_start' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'weekly_report', entity_id: data.id, action: 'updated', new_value: week_start });
    return NextResponse.json({ report: data });
  }

  if (action === 'publish_weekly_report') {
    const { report_id, client_id, published } = body;
    const { error } = await supabase.from('portal_weekly_reports')
      .update({ published, updated_at: new Date().toISOString() }).eq('id', report_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'weekly_report', entity_id: report_id, action: published ? 'published' : 'unpublished' });
    return NextResponse.json({ success: true });
  }

  if (action === 'duplicate_weekly_report') {
    const { client_id, target_week_start } = body;
    const { data: prev } = await supabase.from('portal_weekly_reports').select('*')
      .eq('client_id', client_id).lt('week_start', target_week_start).order('week_start', { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({ source: prev ?? null });
  }

  // ── Monthly reports ───────────────────────────────────────
  if (action === 'upsert_monthly_report') {
    const { client_id, month_key, metrics, highlights, note, published } = body;
    const { data, error } = await supabase.from('portal_monthly_reports')
      .upsert({ client_id, month_key, metrics: metrics ?? {}, highlights: highlights ?? null, note: note ?? null, published: published ?? false, updated_at: new Date().toISOString() },
        { onConflict: 'client_id,month_key' })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'monthly_report', entity_id: data.id, action: 'updated', new_value: month_key });
    return NextResponse.json({ report: data });
  }

  if (action === 'publish_monthly_report') {
    const { report_id, client_id, published } = body;
    const { error } = await supabase.from('portal_monthly_reports')
      .update({ published, updated_at: new Date().toISOString() }).eq('id', report_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'monthly_report', entity_id: report_id, action: published ? 'published' : 'unpublished' });
    return NextResponse.json({ success: true });
  }

  if (action === 'duplicate_monthly_report') {
    const { client_id, target_month_key } = body;
    const { data: prev } = await supabase.from('portal_monthly_reports').select('*')
      .eq('client_id', client_id).lt('month_key', target_month_key).order('month_key', { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({ source: prev ?? null });
  }

  // ── Optimizations ─────────────────────────────────────────
  if (action === 'add_optimization') {
    const { client_id, date, type, campaign, what_done, why, result, visible_to_client, sort_order } = body;
    const { data, error } = await supabase.from('portal_optimizations')
      .insert({ client_id, date, type: type ?? null, campaign: campaign ?? null, what_done,
        why: why ?? null, result: result ?? null, visible_to_client: visible_to_client !== false, sort_order: sort_order ?? 0 })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'optimization', entity_id: data.id, action: 'created', new_value: what_done.slice(0, 80) });
    return NextResponse.json({ optimization: data });
  }

  if (action === 'update_optimization') {
    const { optimization_id, client_id, date, type, campaign, what_done, why, result, visible_to_client, sort_order } = body;
    const { error } = await supabase.from('portal_optimizations')
      .update({ date, type: type ?? null, campaign: campaign ?? null, what_done, why: why ?? null, result: result ?? null,
        visible_to_client, sort_order, updated_at: new Date().toISOString() })
      .eq('id', optimization_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'optimization', entity_id: optimization_id, action: 'updated' });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_optimization') {
    const { optimization_id, client_id } = body;
    const { error } = await supabase.from('portal_optimizations').delete().eq('id', optimization_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'optimization', entity_id: optimization_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  // ── Content ───────────────────────────────────────────────
  if (action === 'add_content') {
    const { client_id, name, format, send_date, status, metrics, notes, visible_to_client, sort_order } = body;
    const { data, error } = await supabase.from('portal_content')
      .insert({ client_id, name, format: format ?? null, send_date: send_date ?? null,
        status: status || 'pendente', metrics: metrics ?? {}, notes: notes ?? null,
        visible_to_client: visible_to_client !== false, sort_order: sort_order ?? 0 })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'content', entity_id: data.id, action: 'created', new_value: name });
    return NextResponse.json({ item: data });
  }

  if (action === 'update_content') {
    const { content_id, client_id, name, format, send_date, status, metrics, notes, visible_to_client, sort_order } = body;
    const { error } = await supabase.from('portal_content')
      .update({ name, format: format ?? null, send_date: send_date ?? null, status, metrics: metrics ?? {},
        notes: notes ?? null, visible_to_client, sort_order, updated_at: new Date().toISOString() })
      .eq('id', content_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'content', entity_id: content_id, action: 'updated', field: 'status', new_value: status });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_content') {
    const { content_id, client_id } = body;
    const { error } = await supabase.from('portal_content').delete().eq('id', content_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'content', entity_id: content_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  // ── Launches ──────────────────────────────────────────────
  if (action === 'add_launch') {
    const { client_id, name, start_date, end_date, status, goals, results, debrief, ideas, sort_order } = body;
    const { data, error } = await supabase.from('portal_launches')
      .insert({ client_id, name, start_date: start_date ?? null, end_date: end_date ?? null,
        status: status || 'planejamento', goals: goals ?? {}, results: results ?? {}, debrief: debrief ?? {}, ideas: ideas ?? null, sort_order: sort_order ?? 0 })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await logActivity(supabase, { client_id, entity: 'launch', entity_id: data.id, action: 'created', new_value: name });
    return NextResponse.json({ launch: data });
  }

  if (action === 'update_launch') {
    const { launch_id, client_id, name, start_date, end_date, status, goals, results, debrief, ideas, sort_order } = body;
    const { error } = await supabase.from('portal_launches')
      .update({ name, start_date: start_date ?? null, end_date: end_date ?? null, status, goals, results, debrief, ideas: ideas ?? null, sort_order, updated_at: new Date().toISOString() })
      .eq('id', launch_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'launch', entity_id: launch_id, action: 'updated' });
    return NextResponse.json({ success: true });
  }

  if (action === 'remove_launch') {
    const { launch_id, client_id } = body;
    const { error } = await supabase.from('portal_launches').delete().eq('id', launch_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (client_id) await logActivity(supabase, { client_id, entity: 'launch', entity_id: launch_id, action: 'deleted' });
    return NextResponse.json({ success: true });
  }

  if (action === 'add_launch_phase') {
    const { launch_id, name, start_date, end_date, order_num } = body;
    const { data, error } = await supabase.from('portal_launch_phases')
      .insert({ launch_id, name, start_date: start_date ?? null, end_date: end_date ?? null, order_num: order_num ?? 0 })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ phase: data });
  }

  if (action === 'update_launch_phase') {
    const { phase_id, name, start_date, end_date, order_num } = body;
    const { error } = await supabase.from('portal_launch_phases')
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
