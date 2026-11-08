import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout', '/portal', '/api/portal', '/api/keep-alive'];
// Rotas chamadas pelo Vercel Cron (sem cookie) — liberadas via header Authorization: Bearer CRON_SECRET
const CRON_PATHS = ['/api/sync-sheets'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && CRON_PATHS.includes(pathname) && request.headers.get('authorization') === `Bearer ${cronSecret}`) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('apr_auth');
  const expectedToken = process.env.APR_AUTH_SECRET || 'apr-hub-token';

  if (authCookie?.value === expectedToken) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
