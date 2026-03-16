import { NextResponse } from 'next/server'

import { auth } from '@/server/auth/config'

// proxy.ts runs on Node.js runtime (unlike the old middleware.ts which ran on
// Edge). This means node:crypto and other Node.js modules are fully supported.
export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isCronRoute = pathname.startsWith('/api/cron')

  // Always allow public and API routes
  if (isLoginPage || isCronRoute || isApiRoute) return NextResponse.next()

  // Dev bypass: allow through when DEV_TELEGRAM_USER_ID is set
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TELEGRAM_USER_ID
  ) {
    return NextResponse.next()
  }

  // Redirect unauthenticated page requests to login.
  // Note: initData (mini app mode) is validated server-side via tRPC context;
  // proxy only checks the NextAuth session cookie.
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
