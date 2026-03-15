import { NextResponse } from 'next/server'

import NextAuth from 'next-auth'

import { edgeAuthConfig } from '@/server/auth/edge-config'

// Use the edge-safe config so the middleware bundle never pulls in node:crypto
const { auth } = NextAuth(edgeAuthConfig)

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isCronRoute = pathname.startsWith('/api/cron')

  // Always allow public and API routes
  if (isLoginPage || isCronRoute || isApiRoute) return NextResponse.next()

  // Redirect unauthenticated page requests to login.
  // Note: initData (mini app mode) is validated server-side via tRPC context;
  // middleware only checks the NextAuth session cookie.
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
