import { NextResponse } from 'next/server';
import { portalCookieName } from '@/lib/portalAuth';

export async function POST(request: Request) {
  const { slug } = await request.json().catch(() => ({ slug: '' }));
  const response = NextResponse.json({ success: true });
  if (slug) {
    response.cookies.set(portalCookieName(slug), '', {
      httpOnly: true,
      maxAge: 0,
      path: '/',
    });
  }
  return response;
}
