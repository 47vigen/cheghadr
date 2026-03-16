# Client-Side i18n Migration Architecture

Migration from root-based (locale-segment) i18n to client-only i18n for the Cheghadr? Next.js app.

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Routes | `/[locale]/...` (e.g. `/fa/login`, `/en/prices`) | Flat: `/`, `/login`, `/prices`, `/calculator`, `/assets/add` |
| Locale detection | Server (next-intl middleware) | Client (Telegram `language_code` or `navigator.language`) |
| Messages | Server-loaded via `getRequestConfig` | Client-loaded via dynamic `import()` |
| `html` lang/dir | Server (layout params) | Client (LocaleProvider effect) |
| useRouter/usePathname | next-intl navigation (locale-prefixed) | Standard `next/navigation` (no prefix) |
| Proxy | Auth + intl middleware | Auth only |

---

## File-by-File Changes

### 1. `next.config.ts`

**Changes:**
- Remove `createNextIntlPlugin` and `withNextIntl` wrapper.
- Add `experimental: { cacheComponents: true }` (or top-level `cacheComponents: true` if supported).
- Keep all other config.

```ts
// Remove:
import createNextIntlPlugin from 'next-intl/plugin'
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
export default withNextIntl(nextConfig)

// Add to nextConfig:
cacheComponents: true,  // or under experimental if required
```

---

### 2. `src/proxy.ts`

**Changes:**
- Remove `createIntlMiddleware` and all next-intl imports.
- Remove locale-stripping logic (`localePattern`, `normalizedPath`).
- Use raw `pathname` for path matching.
- Redirect to `/login` (no locale prefix).
- Remove `nonDefaultLocale` / locale-preserving redirect logic.

**Before:** Proxy ran intl middleware for every request; redirects preserved locale prefix.

**After:** Proxy only checks auth; redirects to `/login` unconditionally.

```ts
// Simplified: no intl, no locale in paths
export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')

  if (isLoginPage || isApiRoute) return NextResponse.next()

  if (process.env.NODE_ENV === 'development' && process.env.DEV_TELEGRAM_USER_ID) {
    return NextResponse.next()
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})
```

---

### 3. `src/app/layout.tsx` (root layout)

**Changes:**
- Provide full `<html>` and `<body>` with default `lang="en"` and `dir="ltr"`.
- Wrap children with `LocaleProvider` (client) which will update `lang`/`dir` after hydration.
- Include `TRPCReactProvider`, `ClientProviders`, `Toaster`, `globals.css`, `Vazirmatn`.
- Move `metadata` from `[locale]/layout.tsx` (title, description).
- Remove `force-dynamic` (no longer needed; was in `[locale]/layout.tsx`).

**Structure:**
```tsx
import type { Metadata } from 'next'
// ... imports: LocaleProvider, TRPCReactProvider, ClientProviders, Toaster, Vazirmatn, '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={Vazirmatn.variable}>
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

---

### 4. **NEW** `src/components/locale-provider.tsx`

**Purpose:** Client-only provider that:
1. Detects locale (Telegram `initDataUnsafe.user.language_code` or `navigator.language`).
2. Maps to supported locales (`en`, `fa`).
3. Dynamically imports `messages/{locale}.json`.
4. Renders `NextIntlClientProvider` with `locale` + `messages`.
5. Updates `document.documentElement.lang` and `document.documentElement.dir` when locale changes.

**Locale detection logic:**
```ts
function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const tg = (window as any).Telegram?.WebApp
  const tgLang = tg?.initDataUnsafe?.user?.language_code
  if (tgLang) {
    const normalized = tgLang.toLowerCase().slice(0, 2)
    return normalized === 'fa' ? 'fa' : 'en'
  }
  const nav = navigator.language?.toLowerCase().slice(0, 2)
  return nav === 'fa' ? 'fa' : 'en'
}
```

**Messages loading:**
```ts
const messages = await import(`@/messages/${locale}.json`).then(m => m.default)
```

**HTML attributes:**
```ts
useEffect(() => {
  document.documentElement.lang = locale
  document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
}, [locale])
```

**Gotcha:** `LocaleProvider` must be a client component; wrap in `'use client'`. Use `useState` + `useEffect` for locale/messages; show minimal loading state (or `null`) until messages load to avoid flash of untranslated content.

---

### 5. **DELETE** `src/app/[locale]/` directory

**Action:** Move all routes out of `[locale]` to flat structure.

| Current path | New path |
|--------------|----------|
| `src/app/[locale]/layout.tsx` | **DELETE** (logic moves to root layout + LocaleProvider) |
| `src/app/[locale]/login/page.tsx` | `src/app/login/page.tsx` |
| `src/app/[locale]/(app)/layout.tsx` | `src/app/(app)/layout.tsx` |
| `src/app/[locale]/(app)/page.tsx` | `src/app/(app)/page.tsx` |
| `src/app/[locale]/(app)/prices/page.tsx` | `src/app/(app)/prices/page.tsx` |
| `src/app/[locale]/(app)/calculator/page.tsx` | `src/app/(app)/calculator/page.tsx` |
| `src/app/[locale]/(app)/assets/add/page.tsx` | `src/app/(app)/assets/add/page.tsx` |
| `src/app/[locale]/(app)/error.tsx` | `src/app/(app)/error.tsx` |
| `src/app/[locale]/(app)/loading.tsx` | `src/app/(app)/loading.tsx` |

---

### 6. `src/app/(app)/layout.tsx`

**Changes:**
- No changes to component logic.
- File moves from `[locale]/(app)/` to `(app)/`.

---

### 7. `src/i18n/navigation.ts`

**Changes:**
- Replace next-intl `createNavigation` with re-exports from `next/navigation`.
- `useRouter` → `useRouter` from `next/navigation`.
- `usePathname` → `usePathname` from `next/navigation`.
- `Link` → `Link` from `next/link` (no `locale` prop).
- `redirect` → `redirect` from `next/navigation`.
- `getPathname` → Remove or implement as simple pathname helper if still used (currently unused in codebase).

```ts
export { useRouter, usePathname, redirect } from 'next/navigation'
export { Link } from 'next/link'
// getPathname: remove or export (path) => path if needed
```

**Gotcha:** `next/link` and `next/navigation` do not add locale prefixes. All paths stay as `/`, `/login`, `/prices`, etc.

---

### 8. `src/i18n/routing.ts`

**Changes:**
- Keep `locales` and `defaultLocale` for use in `LocaleProvider` and `detectLocale`.
- Remove `defineRouting` if it's only used for next-intl middleware; keep a simple config object.

```ts
export const routing = {
  locales: ['en', 'fa'] as const,
  defaultLocale: 'en' as const,
}
export type Locale = (typeof routing.locales)[number]
```

---

### 9. **DELETE** `src/i18n/request.ts`

**Reason:** No server-side request config; messages are loaded client-side only.

---

### 10. Components using `useLocale`, `useTranslations`, `useRouter`, `usePathname`

**No changes required** to imports or usage:
- `useLocale` → from `next-intl` (works inside `NextIntlClientProvider`)
- `useTranslations` → from `next-intl` (works inside `NextIntlClientProvider`)
- `useRouter` → from `@/i18n/navigation` (now `next/navigation`)
- `usePathname` → from `@/i18n/navigation` (now `next/navigation`)

**Files to verify (no code changes, only ensure they import from correct places):**
- `src/components/bottom-nav.tsx` — `usePathname`, `useRouter`, `useTranslations`
- `src/app/login/page.tsx` — `useRouter`, `useTranslations`
- `src/app/(app)/page.tsx` — `useTranslations`
- `src/app/(app)/prices/page.tsx` — `useTranslations`
- `src/app/(app)/calculator/page.tsx` — `useTranslations`
- `src/app/(app)/assets/add/page.tsx` — `useRouter`, `useTranslations`
- `src/app/(app)/error.tsx` — `useTranslations`
- `src/components/price-section.tsx`, `staleness-banner.tsx`, `empty-state.tsx`, `asset-selector.tsx`, `portfolio-total.tsx`, `portfolio-chart.tsx`, `asset-picker.tsx`, `asset-list-item.tsx`, `price-row.tsx`, `calculator-result.tsx`, `change-label.tsx`, `skeletons/calculator-skeleton.tsx` — all use `useLocale` and/or `useTranslations`; no changes.

---

### 11. `src/components/client-providers.tsx`

**Changes:**
- No structural change; `LocaleProvider` (which wraps `NextIntlClientProvider`) is added higher in the tree (root layout).
- Ensure `ClientProviders` does not duplicate `Toaster` if root layout already has it. Root layout has `Toaster`; `ClientProviders` also has `Toaster` — remove one (e.g. from `ClientProviders` to avoid duplication).

---

### 12. `src/utils/telegram.ts`

**Optional:** Add helper for locale detection:

```ts
export function getTelegramLanguageCode(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const tg = (window as any).Telegram?.WebApp
  return tg?.initDataUnsafe?.user?.language_code
}
```

Use in `LocaleProvider` for consistency with Telegram utilities.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/components/locale-provider.tsx` | Client provider: locale detection, dynamic message loading, `NextIntlClientProvider`, `html` lang/dir sync |

---

## Deleted Files Summary

| File | Reason |
|------|--------|
| `src/app/[locale]/layout.tsx` | Replaced by root layout + LocaleProvider |
| `src/app/[locale]/login/page.tsx` | Moved to `src/app/login/page.tsx` |
| `src/app/[locale]/(app)/*` (all) | Moved to `src/app/(app)/*` |
| `src/i18n/request.ts` | No server-side i18n config |

---

## Gotchas

### 1. **Flash of wrong language**
- Before messages load, `NextIntlClientProvider` may not be ready. Options:
  - Show a minimal loading spinner/skeleton until messages load.
  - Or render with default locale messages synchronously for initial paint, then switch if Telegram says otherwise (adds complexity).

### 2. **SSR / hydration**
- `document.documentElement` is only available in the browser. Use `useEffect` for `lang`/`dir` updates.
- Root layout renders with `lang="en"` and `dir="ltr"` initially; client updates after hydration. Brief mismatch possible for RTL users.

### 3. **Telegram `initDataUnsafe` availability**
- In Mini App, `initDataUnsafe` is set by Telegram before React mounts. If accessed in `useEffect`, it should be ready.
- In standalone (no Telegram), `initDataUnsafe` is undefined; fallback to `navigator.language`.

### 4. **Language code mapping**
- Telegram `language_code` can be `"en"`, `"fa"`, `"en-US"`, etc. Map to `en` or `fa` only (e.g. `slice(0, 2)` and check for `fa`).

### 5. **`cacheComponents`**
- Verify this option exists in your Next.js version. If not, skip or use the correct experimental flag name.

### 6. **Typed routes**
- With `typedRoutes: true`, removing `[locale]` will change generated route types. Run `next typegen` after migration.

### 7. **Metadata**
- `metadata` in layout (title, description) is static. If you need locale-specific metadata, you’d need a different approach (e.g. client-side `document.title` or a layout that reads locale from context — complex with client-only locale).

### 8. **`redirect` from server**
- If any server code uses `redirect` from `@/i18n/navigation`, it will now be `next/navigation`’s `redirect` — no locale. Ensure no server code relied on locale-preserving redirects.

### 9. **Message JSON path**
- Dynamic `import(\`@/messages/${locale}.json\`)` requires the path to resolve at build time. Ensure `messages/en.json` and `messages/fa.json` exist and `@/` alias points correctly.

### 10. **ClientProviders vs root layout**
- Avoid duplicate `Toaster`. Keep it in root layout; remove from `ClientProviders` if present.

---

## Migration Order

1. Create `LocaleProvider` and wire it in root layout (without removing `[locale]` yet).
2. Update `src/i18n/navigation.ts` to re-export from `next/navigation` and `next/link`.
3. Update `next.config.ts` (remove plugin, add `cacheComponents`).
4. Update `proxy.ts` (remove intl middleware).
5. Move routes from `[locale]/` to flat structure.
6. Delete `[locale]` layout and `src/i18n/request.ts`.
7. Update root layout to own `<html>`, `<body>`, and providers.
8. Run `pnpm typecheck` and `pnpm lint`; fix any issues.
9. Manually test: Mini App (Telegram), standalone (browser), locale switch behavior, RTL for `fa`.
