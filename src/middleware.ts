import { NextResponse } from 'next/server'

import { auth } from '@/server/auth/config'

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isTrpcRoute = pathname.startsWith('/api/trpc')
  const isCronRoute = pathname.startsWith('/api/cron')

  // Always allow public routes
  if (isLoginPage || isCronRoute) return NextResponse.next()

  // tRPC and auth routes handle their own authentication
  if (isTrpcRoute || isApiRoute) return NextResponse.next()

  // Redirect unauthenticated page requests to login
  // Note: initData (mini app mode) is validated client-side;
  // middleware only checks the NextAuth session cookie
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
