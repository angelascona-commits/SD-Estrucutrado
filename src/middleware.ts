import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'sgem_session'

// Rutas que no requieren sesión
const PUBLIC_ROUTES = ['/login']

// Ruta por defecto después de login
const DEFAULT_AUTHENTICATED_ROUTE = '/service-desk'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(COOKIE_NAME)?.value

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthenticated = Boolean(session)

  // Sin sesión intentando acceder a ruta protegida → login
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión intentando acceder a login → dashboard
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Excluye archivos estáticos, imágenes y API routes de Next.js
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
