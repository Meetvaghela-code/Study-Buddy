import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'studybuddy_session'
const PROTECTED_PREFIXES = ['/dashboard', '/learn', '/practice', '/coach']

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (needsAuth && !hasSession) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/learn/:path*', '/practice/:path*', '/coach/:path*'],
}
