import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword, makePortalToken, portalCookieName } from '@/lib/portalAuth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const { slug, password } = await request.json();
    if (!slug || !password) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const { data: portal } = await supabase
      .from('client_portals')
      .select('id, slug, password_hash, enabled')
      .eq('slug', slug)
      .single();

    if (!portal || !portal.enabled) {
      await new Promise(r => setTimeout(r, 600));
      return NextResponse.json({ error: 'Portal não encontrado' }, { status: 404 });
    }

    const valid = await verifyPassword(password, portal.password_hash);
    if (!valid) {
      await new Promise(r => setTimeout(r, 800));
      return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    // Update last_visit_at
    await supabase
      .from('client_portals')
      .update({ last_visit_at: new Date().toISOString() })
      .eq('id', portal.id);

    const token = await makePortalToken(slug);
    const response = NextResponse.json({ success: true });
    response.cookies.set(portalCookieName(slug), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
}
