import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('apr_auth');
  const expectedToken = process.env.APR_AUTH_SECRET || 'apr-hub-token';

  if (authCookie?.value !== expectedToken) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  return NextResponse.json({
    id: 'a0000000-apr-0000-0000-000000000001',
    email: process.env.APR_USER_EMAIL || '',
  });
}
