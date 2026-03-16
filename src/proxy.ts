import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'

import { routing } from '@/i18n/routing'
import { auth } from '@/server/auth/config'

// Create the next-intl middleware
const intlMiddleware = createIntlMiddleware(routing)

// proxy.ts runs on Node.js runtime (unlike the old middleware.ts which ran on
// Edge). This means node:crypto and other Node.js modules are fully supported.
export default auth((req) => {
  const { pathname } = req.nextUrl

  // Skip locale handling for API routes and static files
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticFile = pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  const isNextInternal = pathname.startsWith('/_next')

  if (isApiRoute || isStaticFile || isNextInternal) {
    return NextResponse.next()
  }

  // Apply next-intl middleware for locale handling
  const intlResponse = intlMiddleware(req)

  // Strip locale prefix for path matching (e.g. /fa/login → /login)
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/|$)`)
  const normalizedPath = pathname.replace(localePattern, '/')

  const isLoginPage = normalizedPath === '/login'
  const isCronRoute = normalizedPath.startsWith('/api/cron')

  // Always allow public and API routes
  if (isLoginPage || isCronRoute || isApiRoute) return intlResponse

  // Dev bypass: allow through when DEV_TELEGRAM_USER_ID is set
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TELEGRAM_USER_ID
  ) {
    return intlResponse
  }

  // Redirect unauthenticated page requests to login.
  // Note: initData (mini app mode) is validated server-side via tRPC context;
  // proxy only checks the NextAuth session cookie.
  if (!req.auth) {
    // Get the locale from the intl response to preserve it in redirect
    const locale = intlResponse.headers.get('x-middleware-request-x-next-intl-locale') || routing.defaultLocale
    const loginUrl = new URL(`/${locale}/login`, req.url)
    return NextResponse.redirect(loginUrl)
  }

  return intlResponse
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
