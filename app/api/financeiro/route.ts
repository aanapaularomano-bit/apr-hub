import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('apr_financeiro')
      .select('month_key, data, updated_at')
      .order('month_key', { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { month_key, data: monthData, expected_updated_at } = await request.json();
    if (!month_key || !monthData) return NextResponse.json({ error: 'Dados obrigatórios' }, { status: 400 });
    const supabase = getSupabaseAdmin();
    const updated_at = new Date().toISOString();

    // Sem versão esperada: comportamento antigo (grava por cima)
    if (expected_updated_at === undefined) {
      const { error } = await supabase
        .from('apr_financeiro')
        .upsert({ month_key, data: monthData, updated_at }, { onConflict: 'month_key' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, updated_at });
    }

    // Com versão esperada: só grava se ninguém alterou o mês desde que esta tela carregou
    const conflict = async () => {
      const { data: cur } = await supabase
        .from('apr_financeiro')
        .select('data, updated_at')
        .eq('month_key', month_key)
        .maybeSingle();
      return NextResponse.json({ conflict: true, data: cur?.data ?? null, updated_at: cur?.updated_at ?? null }, { status: 409 });
    };

    if (expected_updated_at === null) {
      const { error } = await supabase.from('apr_financeiro').insert({ month_key, data: monthData, updated_at });
      if (error) return error.code === '23505' ? conflict() : NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ success: true, updated_at });
    }

    const { data: rows, error } = await supabase
      .from('apr_financeiro')
      .update({ data: monthData, updated_at })
      .eq('month_key', month_key)
      .eq('updated_at', expected_updated_at)
      .select('updated_at');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rows || rows.length === 0) return conflict();
    return NextResponse.json({ success: true, updated_at });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
