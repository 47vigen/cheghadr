import createIntlMiddleware from 'next-intl/middleware'
import { NextResponse } from 'next/server'

import { routing } from '@/i18n/routing'
import { auth } from '@/server/auth/config'

// proxy.ts runs on Node.js runtime (unlike the old middleware.ts which ran on
// Edge). This means node:crypto and other Node.js modules are fully supported.

// Handles locale detection and URL rewriting (e.g. / → [locale=en] internally).
const intlMiddleware = createIntlMiddleware(routing)

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Strip locale prefix for path matching (e.g. /fa/login → /login)
  const localePattern = new RegExp(`^/(${routing.locales.join('|')})(/|$)`)
  const normalizedPath = pathname.replace(localePattern, '/')

  const isLoginPage = normalizedPath === '/login'
  const isApiRoute = normalizedPath.startsWith('/api/')

  // Always allow public and API routes; run intl middleware so locale routing
  // works (e.g. /login is rewritten to [locale=en]/login internally).
  if (isLoginPage || isApiRoute) return intlMiddleware(req)

  // Dev bypass: allow through when DEV_TELEGRAM_USER_ID is set
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TELEGRAM_USER_ID
  ) {
    return intlMiddleware(req)
  }

  // Redirect unauthenticated page requests to login, preserving locale prefix.
  // Note: initData (mini app mode) is validated server-side via tRPC context;
  // proxy only checks the NextAuth session cookie.
  if (!req.auth) {
    const nonDefaultLocale = routing.locales.find(
      (l) =>
        l !== routing.defaultLocale &&
        (pathname.startsWith(`/${l}/`) || pathname === `/${l}`),
    )
    const loginPath = nonDefaultLocale ? `/${nonDefaultLocale}/login` : '/login'
    return NextResponse.redirect(new URL(loginPath, req.url))
  }

  // Run intl middleware to rewrite locale-prefixed URLs (e.g. / → [locale=en]).
  return intlMiddleware(req)
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
