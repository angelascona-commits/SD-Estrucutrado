import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'sgem_session'

// Rutas que no requieren sesión
const PUBLIC_ROUTES = ['/login']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = request.cookies.get(COOKIE_NAME)?.value

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthenticated = Boolean(session)

  // Sin sesión intentando acceder a ruta protegida → login
  if (!isAuthenticated && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Con sesión intentando acceder a login → redirigir a raíz / para calcular su primer dominio permitido
  if (isAuthenticated && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Excluye archivos estáticos, imágenes y API routes de Next.js
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
