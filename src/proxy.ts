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

  // Tenta pegar a sessão do Appwrite via cookies
  const sessionCookie = request.cookies.get('studypro-session') ||
                        request.cookies.get('a_session_' + (process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')) ||
                        request.cookies.get('a_session')

  if (!sessionCookie?.value) {
    // Se não houver cookie, permite navegação local/dev ou redireciona em prod se exigido
    if (process.env.NODE_ENV === 'production') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  try {
    const { account } = createSessionClient(sessionCookie.value)
    await account.get()
    return NextResponse.next()
  } catch (error) {
    console.error('Sessão expirada ou inválida no proxy:', error)
    return NextResponse.next()
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
