import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const correctPassword = process.env.APR_PASSWORD;
    const authToken = process.env.APR_AUTH_SECRET || 'apr-hub-token';

    if (!correctPassword) {
      return NextResponse.json(
        { error: 'Configuração de senha não encontrada. Contate o administrador.' },
        { status: 500 }
      );
    }

    if (password !== correctPassword) {
      // Pequeno delay pra dificultar brute force
      await new Promise(r => setTimeout(r, 800));
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({ success: true });

    // Cookie válido por 30 dias
    response.cookies.set('apr_auth', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
      path: '/',
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro ao processar login' },
      { status: 500 }
    );
  }
}
