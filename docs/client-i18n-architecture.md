# Client-Based i18n Architecture

Design for migrating from server-side locale routing (`[locale]`) to client-only locale detection and message loading.

---

## 1. LocaleProvider

A **client component** that:

- **Detects locale** (client-only, in `useEffect`):
  - Primary: `WebApp.initDataUnsafe?.user?.language_code` (from `@twa-dev/sdk`)
  - Map: `fa`, `fa-IR`, `fa-AF` → `fa`; anything else → `en`
  - Fallback: `navigator.language` with same mapping
  - Default: `en`

- **Loads messages** via dynamic import (from `src/components/locale-provider.tsx`):
  ```ts
  const messages = (await import(`../../messages/${locale}.json`)).default
  ```

- **Provides** `locale` + `messages` to `NextIntlClientProvider`

- **Sets `document.documentElement`** in `useEffect`:
  - `lang={locale}`
  - `dir={locale === 'fa' ? 'rtl' : 'ltr'}`

**Implementation sketch:**

```tsx
// src/components/locale-provider.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import WebApp from '@twa-dev/sdk'

const SUPPORTED_LOCALES = ['en', 'fa'] as const
type Locale = (typeof SUPPORTED_LOCALES)[number]

function mapToLocale(code: string | undefined): Locale {
  if (!code) return 'en'
  const lower = code.toLowerCase()
  if (lower.startsWith('fa')) return 'fa'
  return 'en'
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const tg = WebApp?.initDataUnsafe?.user?.language_code
  if (tg) return mapToLocale(tg)
  return mapToLocale(navigator.language)
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    const detected = detectLocale()
    setLocale(detected)
  }, [])

  useEffect(() => {
    if (!locale) return
    import(`../../messages/${locale}.json`).then((m) => {
      setMessages(m.default)
    })
  }, [locale])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
  }, [locale])

  if (!messages) return <>{children}</> // or a minimal loading state

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
```

**Note:** Until messages load, children render without translations. Options:
- Render a minimal loading shell (e.g. Spinner) until `messages` is set
- Or render children immediately with `messages={null}` and accept a brief flash of missing keys (next-intl falls back to key names)

---

## 2. Root Layout

Single `src/app/layout.tsx` with `html`/`body`, no `[locale]` segment:

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { LocaleProvider } from '@/components/locale-provider'
import { ClientProviders } from '@/components/client-providers'
import { TRPCReactProvider } from '@/trpc/react'
import { Vazirmatn } from '@/styles/fonts'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning className={Vazirmatn.variable}>
      <body>
        <LocaleProvider>
          <TRPCReactProvider>
            <ClientProviders>
              {children}
              <Toaster richColors position="top-center" />
            </ClientProviders>
          </TRPCReactProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
```

- `html`/`body` have no `lang`/`dir` initially; `LocaleProvider` sets them on the client.
- All pages move from `app/[locale]/...` to `app/...` (e.g. `app/(app)/page.tsx`, `app/login/page.tsx`).

---

## 3. next-intl Plugin

**Can we use next-intl without the plugin?**

No. The next-intl docs state the plugin is required for App Router. It wires the request config and supports message extraction.

**Do we need `getRequestConfig`?**

Yes, a minimal one. The plugin expects it. Even with client-only usage:

- The root layout is still server-rendered on first load.
- A minimal config avoids plugin/runtime errors and supports any future server usage.

**Minimal `src/i18n/request.ts`:**

```ts
import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async () => ({
  locale: 'en',
  messages: (await import('../../messages/en.json')).default,
}))
```

- Always returns `en` and default messages for SSR.
- Client `LocaleProvider` overrides with detected locale and loaded messages.
- No `routing` or `requestLocale` needed since we no longer use locale routing.

**`next.config.ts`:** Keep the plugin:

```ts
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
export default withNextIntl(nextConfig)
```

---

## 4. Navigation

Replace `@/i18n/navigation` with `next/navigation` and `next/link`:

| Old | New |
|-----|-----|
| `import { useRouter, usePathname, Link } from '@/i18n/navigation'` | `import { useRouter, usePathname } from 'next/navigation'`<br>`import Link from 'next/link'` |
| `useRouter().push('/fa/login')` | `useRouter().push('/login')` |
| `usePathname()` (locale-prefixed) | `usePathname()` (locale-agnostic) |

Paths are locale-agnostic: `/login`, `/assets`, `/prices`, `/calculator`, etc. No `/en` or `/fa` prefix.

**Files to update:**
- `src/components/bottom-nav.tsx`
- `src/components/empty-state.tsx`
- `src/app/[locale]/login/page.tsx` → `src/app/login/page.tsx`
- `src/app/[locale]/(app)/page.tsx`, `error.tsx`, `assets/add/page.tsx`
- Any other component using `@/i18n/navigation`

---

## 5. Proxy / Auth

The proxy (`src/proxy.ts`) currently uses `createIntlMiddleware` for locale detection and URL rewriting. With client-only i18n:

- Remove `createIntlMiddleware` and `intlMiddleware`.
- Paths no longer have locale prefixes; matching uses raw pathname (e.g. `/login`, `/assets/add`).
- Redirect to `/login` (no locale) when unauthenticated.
- Keep auth logic unchanged.

---

## 6. File Structure After Migration

```
src/
├── app/
│   ├── layout.tsx              # Root: html, body, LocaleProvider
│   ├── login/
│   │   └── page.tsx
│   └── (app)/
│       ├── layout.tsx
│       ├── page.tsx
│       ├── prices/page.tsx
│       ├── calculator/page.tsx
│       ├── assets/add/page.tsx
│       ├── error.tsx
│       └── loading.tsx
├── components/
│   ├── locale-provider.tsx     # NEW: client locale + messages
│   └── ...
├── i18n/
│   ├── request.ts              # Minimal: defaultLocale + default messages
│   └── routing.ts              # DELETE or keep only for type Locale
└── ...
```

- Remove `src/i18n/navigation.ts` (or keep as re-exports of `next/navigation` + `next/link` if desired).
- `routing.ts` can be removed or reduced to `export type Locale = 'en' | 'fa'` if still needed.

---

## 7. Summary

| Concern | Approach |
|---------|----------|
| Locale detection | Client: Telegram `initDataUnsafe.user.language_code` → map to `en`/`fa`; fallback `navigator.language` |
| Messages | Dynamic `import(\`../../messages/${locale}.json\`)` in `LocaleProvider` |
| Provider | `NextIntlClientProvider` with `locale` + `messages` from `LocaleProvider` |
| `lang`/`dir` | Set in `useEffect` on `document.documentElement` |
| Root layout | Single `layout.tsx` with `html`/`body`, wrap with `LocaleProvider` |
| next-intl plugin | Keep; minimal `getRequestConfig` returning `en` + default messages |
| Navigation | Use `next/navigation` and `next/link`; locale-agnostic paths |
| Proxy | Remove intl middleware; use raw paths |

---

## 8. Optional: Locale Switching

If you add a manual locale switcher later, store the choice in `localStorage` and have `LocaleProvider` prefer it over Telegram/navigator:

```ts
const stored = localStorage.getItem('locale')
if (stored && SUPPORTED_LOCALES.includes(stored)) return stored as Locale
```
