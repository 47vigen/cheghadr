import { NextResponse } from 'next/server'

import { auth } from '@/server/auth/config'

// proxy.ts runs on Node.js runtime (unlike the old middleware.ts which ran on
// Edge). This means node:crypto and other Node.js modules are fully supported.
// i18n is client-based; proxy only handles auth.

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isGuestPage = pathname === '/prices' || pathname === '/calculator'

  if (isLoginPage || isApiRoute || isGuestPage) return NextResponse.next()

  const isDevBypassAllowed =
    process.env.NODE_ENV === 'development' &&
    !process.env.VERCEL &&
    Boolean(process.env.DEV_TELEGRAM_USER_ID)

  if (isDevBypassAllowed) {
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
