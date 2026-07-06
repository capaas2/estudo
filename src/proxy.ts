import { NextRequest, NextResponse } from 'next/server'
import { createSessionClient } from '@/lib/appwrite/server'

/** Rotas que não precisam de autenticação */
const PUBLIC_ROUTES = ['/login', '/cadastro']

/** Prefixos que devem ser ignorados pelo middleware */
const IGNORED_PREFIXES = ['/api/', '/_next/', '/favicon.ico']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Ignora rotas de API, assets do Next.js, etc.
  if (IGNORED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  // Rotas públicas não precisam de sessão
  if (PUBLIC_ROUTES.some(route => pathname === route)) {
    return NextResponse.next()
  }

  // Tenta pegar a sessão do Appwrite via cookie
  const sessionCookie = request.cookies.get('studypro-session')

  if (!sessionCookie?.value) {
    // Sem cookie de sessão → redireciona para login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Valida a sessão no Appwrite (que agora usa setJWT internamente)
    const { account } = createSessionClient(sessionCookie.value)
    await account.get()
    return NextResponse.next()
  } catch (error) {
    console.error('Erro na validação do proxy Appwrite:', error)
    // Sessão inválida ou expirada → limpa cookie e redireciona
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('studypro-session')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
