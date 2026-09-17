import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/portalAuth';
import { cookies } from 'next/headers';

// Só acessível com o cookie do hub (apr_auth)
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const auth = cookieStore.get('apr_auth')?.value;
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { password } = await req.json();
  if (!password) return NextResponse.json({ error: 'password obrigatório' }, { status: 400 });

  const hash = await hashPassword(password);
  return NextResponse.json({ hash });
}
