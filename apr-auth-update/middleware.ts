import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de autenticação APR Hub
 * Protege todas as rotas exceto:
 * - /login (página de login)
 * - /api/login (endpoint de validação)
 * - /api/logout (endpoint de logout)
 * - assets estáticos (_next, favicon, imagens)
 */

const PUBLIC_PATHS = ['/login', '/api/login', '/api/logout'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignora arquivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // .png, .ico, .svg, .css, etc.
  ) {
    return NextResponse.next();
  }

  // Permite rotas públicas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verifica cookie de autenticação
  const authCookie = request.cookies.get('apr_auth');
  const expectedToken = process.env.APR_AUTH_SECRET || 'apr-hub-token';

  if (authCookie?.value === expectedToken) {
    return NextResponse.next();
  }

  // Não autenticado → redireciona pro login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
