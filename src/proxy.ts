import { NextResponse } from 'next/server'

import { isDevTelegramBypassAllowed } from '@/lib/dev-bypass'
import { auth } from '@/server/auth/config'

// proxy.ts runs on Node.js runtime (unlike the old middleware.ts which ran on
// Edge). This means node:crypto and other Node.js modules are fully supported.
// i18n is client-based; proxy only handles auth.

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isGuestPage = pathname === '/prices' || pathname === '/calculator'
  const isLandingPage = pathname === '/'

  if (isLoginPage || isApiRoute || isGuestPage || isLandingPage)
    return NextResponse.next()

  if (isDevTelegramBypassAllowed()) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
