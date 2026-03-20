# v2 Phase C: Surface Expansion — Implementation Plan

> **Cheghadr? (چه‌قدر؟)** — Personal Net Worth Tracker  
> Phase C expands who can use Cheghadr and how deeply: guest mode for unauthenticated price-checking, multiple named portfolios, and CSV export.  
> Source: [PRD v2](https://www.notion.so/326ba087d94a81f2905fc1a84caabbd9) · [Roadmap v2](https://www.notion.so/326ba087d94a8116b2dbf00ddc6548e8)  
> Phase C ships as **v2.1** — independently deployable after v2.0 (Phases A + B).

---

## Table of Contents

1. [Phase A+B Recap & Starting State](#1-phase-ab-recap--starting-state)
2. [Phase C Scope](#2-phase-c-scope)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Milestone C.1 — Guest Mode (P0)](#4-milestone-c1--guest-mode-p0)
5. [Milestone C.2 — Multiple Named Portfolios (P1)](#5-milestone-c2--multiple-named-portfolios-p1)
6. [Milestone C.3 — CSV Export (P1)](#6-milestone-c3--csv-export-p1)
7. [New & Modified tRPC Procedures](#7-new--modified-trpc-procedures)
8. [Schema Changes Summary](#8-schema-changes-summary)
9. [New i18n Keys](#9-new-i18n-keys)
10. [Dependency Graph & Task Order](#10-dependency-graph--task-order)
11. [Open Questions & Decisions Required](#11-open-questions--decisions-required)
12. [Testing Strategy](#12-testing-strategy)
13. [Definition of Done](#13-definition-of-done)

---

## 1. Phase A+B Recap & Starting State

Phases A and B are complete. Here's what exists and is relevant to Phase C:

| Component | Current State | Phase C Needs |
|---|---|---|
| **Proxy** (`src/proxy.ts`) | Redirects unauthenticated users to `/login` for all page routes; allows `/login` and `/api/*` through | C.1: Allow `/prices` and `/calculator` pages without auth |
| **tRPC context** (`src/server/api/trpc.ts`) | `publicProcedure` (no auth), `protectedProcedure` (requires `telegramUserId`); resolves user from initData, NextAuth session, or dev bypass | C.1: No changes needed — `publicProcedure` is already available |
| **tRPC routers** (`src/server/api/root.ts`) | `prices`, `assets`, `portfolio`, `alerts`, `user` | C.2: Add portfolio CRUD to `portfolio` router; C.3: Add `export` |
| **`prices.latest`** | Already uses `publicProcedure` — no auth guard at tRPC level | C.1: Already guest-ready at the API layer |
| **`assets.list`** | `protectedProcedure`; returns `{ assets[], totalIRT, snapshotAt, stale, usdSellPrice, eurSellPrice }`; each asset has `displayNames: BilingualDisplayNames`, `category`, `valueIRT`, `change`, `sellPrice`, `assetIcon` | C.2: Must accept optional `portfolioId` filter |
| **`assets.add`** | `protectedProcedure`; upserts on `(userId, symbol)` via `userId_symbol` unique; triggers `createPortfolioSnapshot` | C.2: Must accept `portfolioId`; change unique constraint to `(userId, symbol, portfolioId)` |
| **`portfolio.*`** | `history`, `delta`, `breakdown` — all `protectedProcedure`, query by `ctx.user.id` | C.2: Must accept optional `portfolioId`; add `list`, `create`, `rename`, `delete` |
| **`user.setPreferredLocale`** | `protectedProcedure`; stores user's preferred locale (`en` \| `fa`) | C.1: Will fail for guest users — `LocaleProvider` calls this on locale change; needs graceful handling |
| **`PortfolioSnapshot`** | `{ userId, snapshotAt, totalIRT, breakdown }` — one per user per snapshot | C.2: Add optional `portfolioId`; `null` = consolidated |
| **`UserAsset`** | `{ userId, symbol, quantity }`; unique on `(userId, symbol)` | C.2: Add `portfolioId` FK; change unique to `(userId, symbol, portfolioId)` |
| **Prisma schema** | `User` (with `preferredLocale: PreferredLocale`), `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot`, `Alert`; enums: `AlertType`, `AlertDir`, `PreferredLocale` | C.2: Add `Portfolio` model + FKs |
| **Bottom nav** (`src/components/bottom-nav.tsx`) | 3 tabs: My Assets (`/`), Prices (`/prices`), Calculator (`/calculator`) | C.1: No structural change; tabs work for guests |
| **Login page** (`src/app/login/page.tsx`) | Mini app auto-login via initData; standalone shows Telegram Widget; redirects to `/` on success | C.1: Add `callbackUrl` support for post-login redirect |
| **My Assets page** (`src/app/(app)/page.tsx`) | Calls `assets.list`, `portfolio.history`, `portfolio.breakdown`, `alerts.list` — all protected; uses `computeBiggestMover(data.assets, locale)`; has `selectedCategory` state for breakdown drill-down; scroll spacer for FAB | C.1: Proxy redirects guests to login; C.2: Add portfolio selector |
| **Error boundary** (`src/app/(app)/error.tsx`) | Catches `UNAUTHORIZED` → shows "Session expired" + re-login; also handles connection errors | C.1: Guest hitting `/` is redirected by proxy before reaching this |
| **Bilingual i18n** | `LocaleProvider` detects locale from Telegram/browser, wraps app in `NextIntlClientProvider`, persists via `user.setPreferredLocale` mutation; `BilingualDisplayNames` type for asset labels; `pickDisplayName(names, locale, fallback)` for locale-aware display | C.1: Must handle locale persistence failure for guests; C.1–C.3: Add `guest`, `portfolios`, `export` namespaces |
| **Client providers** (`src/components/client-root.tsx`) | `LocaleProvider` → `TRPCReactProvider` → `ClientProviders` (just `TelegramProvider`) → `Toaster`; **no `SessionProvider`** from NextAuth | C.1: Add `SessionProvider` for `useSession()` in `GuestLoginBanner` |
| **Telegram SDK** (`src/utils/telegram.ts`) | `getRawInitData()`, `isTelegramWebApp()` | C.3: Need `Telegram.WebApp.openLink` for CSV download |
| **Asset display** | `AssetListItem` uses `displayNames: BilingualDisplayNames` + `pickDisplayName(displayNames, locale, symbol)` for bilingual labels; `AssetPicker` uses `getLocalizedItemName(item, locale)` | C.2: `AssetPicker` will need to pass `portfolioId` to `assets.add` mutation |
| **Price utilities** (`src/lib/prices.ts`) | `getBilingualAssetLabels()`, `pickDisplayName()`, `getLocalizedItemName()`, `getBaseSymbol()`, `formatCompactCurrency()`, `formatIRT()`; defensive `base_currency?.` null checks throughout | No changes needed |

### Key patterns to follow

- **tRPC**: Zod input validation, `protectedProcedure` for auth, `publicProcedure` for prices
- **Prisma**: cuid IDs, `Decimal` for monetary values, `Json` for flexible data, `onDelete: Cascade`
- **UI**: HeroUI v3 (`Button`, `Modal`, `Text`, `Input`), `Section` wrapper, `Cell` for list rows, `PageShell` for page wrapper
- **Numbers**: `formatIRT(value, locale)` for Toman, `formatCompactCurrency(value, currency)` for USD/EUR
- **Colors**: `text-success` (green) / `text-destructive` (red) / `text-muted-foreground` (gray)
- **State**: `api.<router>.<procedure>.useQuery()`, `useUtils()` for invalidation
- **i18n**: `useTranslations()` hook, bilingual `BilingualDisplayNames` type, `pickDisplayName(names, locale, fallback)` for locale-aware display
- **Navigation**: `useRouter()` and `usePathname()` from `@/i18n/navigation`
- **Telegram**: `useTelegramBackButton()`, `useTelegramMainButton()`, `useTelegramHaptics()`
- **Mutations**: Optimistic invalidation via `api.useUtils()` after mutations
- **Locale persistence**: `LocaleProvider` calls `user.setPreferredLocale` — a `protectedProcedure` that silently fails for guests (uses `retry: false`)

---

## 2. Phase C Scope

**Theme:** "Expand who can use Cheghadr and how deeply"

| Milestone | Priority | Effort | Scope |
|---|---|---|---|
| **C.1** Guest Mode | P0 Must | ~2.25 days | Prices + Calculator without login; login prompt on My Assets; sticky CTA; post-login redirect |
| **C.2** Multiple Named Portfolios | P1 Should | ~5.5 days | `Portfolio` model + migration; CRUD procedures; portfolio selector UI; consolidated view; update asset flow |
| **C.3** CSV Export | P1 Should | ~1 day | `portfolio.export` tRPC procedure; export trigger UI; Telegram `openLink` download |

**P0 total: ~2.25 days** · P1 total: ~6.5 days · **Phase C total: ~8.75 days**

Phase C has **schema changes** (C.2 adds the `Portfolio` model and FKs on `UserAsset` + `PortfolioSnapshot`). C.1 and C.3 are schema-free.

---

## 3. Architecture Decisions

### AD-1: How to allow guest access to pages

**Decision: Modify `src/proxy.ts` to whitelist specific guest-accessible paths.**

The proxy currently redirects all unauthenticated page requests to `/login`. For guest mode, we need `/prices` and `/calculator` to be accessible without auth. Options:

1. **Whitelist specific paths in the proxy** — add `/prices` and `/calculator` to the allow list
2. **Allow all pages through** and handle auth at the component level
3. **Create a separate route group** `(public)` for guest-accessible pages

Choosing **Option 1** because:
- Minimal change (2 lines in proxy)
- Preserves security-by-default for all other routes (current and future)
- No structural refactor of the route groups needed
- The My Assets page at `/` remains auth-gated at the proxy level, but we'll enhance the error boundary to show a proper guest prompt instead of "Session expired"

```typescript
// src/proxy.ts — modified
const isGuestPage = pathname === '/prices' || pathname === '/calculator'
if (isLoginPage || isApiRoute || isGuestPage) return NextResponse.next()
```

### AD-2: How guests experience the My Assets tab

**Decision: Enhance the `UNAUTHORIZED` error boundary to show a designed guest prompt.**

When a guest taps "My Assets" (the `/` tab):
- The proxy redirects to `/login` (since `/` is not in the guest whitelist)
- This is actually the correct behavior — the login page is the right place for a guest who wants to access My Assets

However, we should improve the login page to:
1. Show a contextualized message when redirected from My Assets ("Log in to track your portfolio")
2. After login, redirect back to `/` (My Assets) — preserve navigation intent

This is simpler and safer than allowing `/` for guests and handling the UNAUTHORIZED state in the component tree. It avoids loading the heavy My Assets page + firing 4 tRPC queries that will all fail.

**Flow:**
```
Guest taps "My Assets" tab
  → proxy redirects to /login?callbackUrl=/
    → login page shows "Log in to track your portfolio" + Telegram Widget
      → successful login → redirect to / (My Assets)
```

### AD-3: Standalone web landing state for guests

**Decision: Add a sticky login CTA banner in the `(app)/layout.tsx` when unauthenticated.**

For standalone web guests who land on `/prices` or `/calculator`:
- The page renders normally with live price data
- A sticky banner at the top shows "Track your portfolio — Log in with Telegram"
- The banner links to `/login?callbackUrl=/`
- The banner does **not** appear for authenticated users or in Telegram mini app mode (where auth is handled via initData)

We detect the auth state client-side using a lightweight mechanism: a new `useAuthStatus()` hook that checks for the presence of `getRawInitData()` (mini app) or calls `useSession()` from NextAuth (standalone). If neither indicates auth, show the banner.

**`SessionProvider` requirement:** The `useSession()` hook requires `SessionProvider` from `next-auth/react` in the React tree. Currently, the provider stack is `LocaleProvider` → `TRPCReactProvider` → `ClientProviders` (just `TelegramProvider`) — **no `SessionProvider`**. We need to add it.

**`LocaleProvider` guest compatibility:** The `LocaleProvider` calls `api.user.setPreferredLocale.useMutation({ retry: false })` on every locale change. This is a `protectedProcedure` and will throw `UNAUTHORIZED` for guests. Since it already uses `retry: false`, the mutation fails silently without retrying — the guest's locale still works client-side (from Telegram `language_code` or `navigator.language`), it just doesn't persist server-side. **No change needed** — the existing `retry: false` handles this gracefully.

### AD-4: Portfolio model and migration strategy

**Decision: New `Portfolio` model with silent migration — auto-create default portfolio for existing users.**

The `Portfolio` model is straightforward:

```prisma
model Portfolio {
  id        String      @id @default(cuid())
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String
  emoji     String?
  createdAt DateTime    @default(now())
  assets    UserAsset[]
  snapshots PortfolioSnapshot[]

  @@index([userId])
}
```

**Migration plan (3 steps, wrapped in a transaction):**

1. Add `Portfolio` model to schema
2. Add nullable `portfolioId` columns to `UserAsset` and `PortfolioSnapshot`
3. Run a data migration script:
   - For each user who has at least one `UserAsset`:
     - Create a default `Portfolio { name: "سبد من", emoji: "💼" }` (or localized name)
     - Update all their `UserAsset` records to point to this portfolio
     - Update all their `PortfolioSnapshot` records to point to this portfolio
4. After migration, the `portfolioId` FK can remain nullable at the database level (null = consolidated view for `PortfolioSnapshot`), but all new `UserAsset` records must have a `portfolioId`

**Why nullable `portfolioId` on `PortfolioSnapshot`:**
- `null` means "consolidated across all portfolios" — used for the top-level total
- A specific `portfolioId` means "snapshot for this specific portfolio"
- This dual-purpose avoids needing a separate `ConsolidatedSnapshot` model

### AD-5: Unique constraint change for `UserAsset`

**Decision: Change unique constraint from `(userId, symbol)` to `(userId, symbol, portfolioId)`.**

Currently, a user can only hold one entry per symbol across their entire account. With multiple portfolios, the same symbol (e.g., USD) may appear in different portfolios. The unique constraint must include `portfolioId`.

This is a **breaking change** at the database level — requires a migration that:
1. Drops the old `@@unique([userId, symbol])` constraint
2. Adds the new `@@unique([userId, symbol, portfolioId])` constraint

Since all existing `UserAsset` records will have `portfolioId` assigned by the data migration (AD-4 step 3), this is safe.

### AD-6: How portfolio snapshots work with multiple portfolios

**Decision: Create per-portfolio snapshots AND a consolidated (null portfolioId) snapshot.**

When the cron runs or an asset is modified:
1. Create a snapshot for the specific portfolio being modified (with `portfolioId` set)
2. Create a consolidated snapshot (with `portfolioId: null`) summing all portfolios

The consolidated snapshot powers the top-level total and delta. Per-portfolio snapshots power per-portfolio charts and deltas.

The `createPortfolioSnapshot()` function in `src/lib/portfolio.ts` must be updated to:
- Accept an optional `portfolioId` parameter
- When called with a specific portfolio: snapshot that portfolio's assets only
- Always also create/update the consolidated snapshot

### AD-7: Portfolio selector UI pattern

**Decision: Dropdown selector at the top of My Assets page.**

Options from PRD Open Question #6:
1. **Tabs** — one tab per portfolio, plus a "Consolidated" tab
2. **Dropdown** — a selector at the top that switches the active portfolio

Choosing **dropdown** because:
- Scales better (users could have 5+ portfolios; tabs would be cramped on mobile)
- Less disruptive to the current layout
- Consistent with financial app patterns (most portfolio trackers use a dropdown/modal for switching)
- The "Consolidated" view is the default and always available

Implementation: A `Select` component (from HeroUI) at the top of the hero section, showing:
- "📊 همه سبدها" (All Portfolios) — default, shows consolidated total
- "💼 سبد من" (My Portfolio) — the default portfolio
- User-created portfolios with their custom emoji + name
- "➕ سبد جدید" (New Portfolio) — action item at the bottom

### AD-8: CSV export delivery mechanism

**Decision: Return CSV as a data URL from a tRPC query, trigger download client-side.**

Options:
1. **Server-side streaming** — a Next.js API route that streams CSV content
2. **tRPC procedure returning CSV string** — client converts to blob and triggers download
3. **tRPC procedure returning data** — client formats as CSV and downloads

Choosing **Option 2** because:
- Keeps the logic in tRPC (consistent with existing architecture)
- No new API route needed
- The data volume is small (365 rows max × 4 columns ≈ 30KB)
- Client-side download works in both standalone web and mini app mode

For mini app mode: use `Telegram.WebApp.openLink(dataUrl)` to trigger the download. If that doesn't work with data URLs, fall back to creating a temporary server endpoint.

For standalone web: create a `Blob`, generate an object URL, click a hidden `<a>` element.

---

## 4. Milestone C.1 — Guest Mode (P0)

**Goal:** Prices and Calculator accessible without authentication, in both Telegram mini app and standalone web.  
**No schema changes. No new tRPC procedures.**

### Task C.1.1 — Modify proxy to allow guest pages

**File:** `src/proxy.ts` (modified)

```typescript
export default auth((req) => {
  const { pathname } = req.nextUrl

  const isLoginPage = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isGuestPage = pathname === '/prices' || pathname === '/calculator'

  if (isLoginPage || isApiRoute || isGuestPage) return NextResponse.next()

  if (
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TELEGRAM_USER_ID
  ) {
    return NextResponse.next()
  }

  if (!req.auth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})
```

**Changes:**
1. Add `isGuestPage` check for `/prices` and `/calculator`
2. When redirecting to `/login`, include `callbackUrl` query parameter preserving the user's intended destination

This is the smallest change with the largest impact — it immediately unlocks guest access to Prices and Calculator for both mini app and standalone web.

### Task C.1.2 — Handle `callbackUrl` in login page

**File:** `src/app/login/page.tsx` (modified)

Extract `callbackUrl` from the URL search params and use it after successful login:

```typescript
export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const t = useTranslations('login')

  // ... existing state ...

  // In mini app signIn success:
  signIn('telegram-miniapp', { initData: rawInitData, redirect: false })
    .then((result) => {
      if (result?.ok) {
        router.replace(callbackUrl)  // was: router.replace('/')
      }
      // ...
    })

  // In standalone signIn success:
  window.onTelegramAuth = async (user) => {
    const result = await signIn('telegram', { ...user, redirect: false })
    if (result?.ok) {
      router.push(callbackUrl)  // was: router.push('/')
    }
    // ...
  }
}
```

When `callbackUrl=/` (the default), this shows that the guest came from tapping My Assets and should be sent there after login. When the param is absent, behavior is identical to today.

### Task C.1.3 — Contextual login prompt

**File:** `src/app/login/page.tsx` (modified)

Show a different subtitle when the user is redirected from My Assets:

```typescript
const isFromAssets = callbackUrl === '/'
const subtitleKey = isFromAssets ? 'subtitlePortfolio' : 'subtitle'
```

New i18n keys:
- `login.subtitlePortfolio`: "برای پیگیری سبد دارایی خود وارد شوید" (Log in to track your portfolio)

This creates a clear value proposition for guests who navigate to My Assets.

### Task C.1.4 — Sticky login CTA banner for standalone web guests

**File:** `src/components/guest-login-banner.tsx` (new)

A banner component shown at the top of the app layout for unauthenticated standalone web users:

```
┌──────────────────────────────────────────────┐
│ 📊  Track your portfolio  →  Log in          │
└──────────────────────────────────────────────┘
```

Props: none (self-contained — reads auth state internally).

**Visibility rules:**
- Shown when: standalone web mode AND no NextAuth session AND no Telegram initData
- Hidden when: user is authenticated OR user is in Telegram mini app
- Not shown on the `/login` page itself

**Implementation:**

```typescript
'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'
import { getRawInitData } from '@/utils/telegram'

export function GuestLoginBanner() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('guest')

  // Don't show in Telegram mini app (auth handled via initData)
  if (getRawInitData()) return null

  // Don't show on login page
  if (pathname === '/login') return null

  // Don't show if authenticated or still loading
  if (status === 'loading' || session) return null

  return (
    <div className="sticky top-0 z-50 ...">
      <button onClick={() => router.push('/login?callbackUrl=/')}>
        {t('ctaBanner')}
      </button>
    </div>
  )
}
```

### Task C.1.5 — Add `GuestLoginBanner` to app layout

**File:** `src/app/(app)/layout.tsx` (modified)

```typescript
import { GuestLoginBanner } from '@/components/layout/guest-login-banner'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <DevLocaleSwitcher />
      <GuestLoginBanner />
      <main className="...">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

### Task C.1.6 — Add `SessionProvider` to the provider tree

**File:** `src/components/client-root.tsx` (modified)

The `useSession()` hook from NextAuth requires a `SessionProvider` in the React tree. Currently, the provider stack is:

```
ClientRoot
├── LocaleProvider
│   └── TRPCReactProvider
│       └── ClientProviders (just TelegramProvider)
│           └── children + Toaster
```

**`SessionProvider` is NOT present.** Add it to `ClientRoot`:

```typescript
import { SessionProvider } from 'next-auth/react'

export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LocaleProvider>
        <TRPCReactProvider>
          <ClientProviders>
            {children}
            <Toaster richColors position="top-center" />
          </ClientProviders>
        </TRPCReactProvider>
      </LocaleProvider>
    </SessionProvider>
  )
}
```

`SessionProvider` must be the outermost client provider since it uses React context. It's lightweight — it only fetches the session once and caches it. For guests, `useSession()` returns `{ data: null, status: 'unauthenticated' }` without errors.

### Task C.1.7 — Verify Prices and Calculator pages work unauthenticated

**Files:** `src/app/(app)/prices/page.tsx`, `src/app/(app)/calculator/page.tsx` (verify, likely no changes)

Both pages only call `api.prices.latest.useQuery()` which is already a `publicProcedure`. They should work without any code changes once the proxy allows access.

**Verify:**
- No `protectedProcedure` calls on these pages
- No client-side auth assumptions (e.g., session-dependent rendering)
- The `TRPCReactProvider` in `ClientRoot` works without auth context (it does — the provider just creates the client; auth is per-request via headers)

The calculator page uses `useTelegramHaptics()` which is a no-op outside Telegram — safe for guests.

**`LocaleProvider` guest compatibility:** The `LocaleProvider` calls `api.user.setPreferredLocale` on locale change — a `protectedProcedure`. For guests, this mutation fails silently because it's configured with `retry: false`. The locale still works client-side from detection (Telegram `language_code` or `navigator.language`), it just doesn't persist server-side. **No change needed.**

### Task C.1.8 — Handle mini app guest mode (missing initData)

**File:** `src/components/telegram-provider.tsx` (verify, likely no changes)

When the mini app opens without valid `initData` (e.g., link opened in browser, not Telegram):
- `getRawInitData()` returns null
- The Telegram provider already handles this gracefully (it only runs SDK methods when initData is present)
- tRPC requests go out without the `x-telegram-init-data` header
- `publicProcedure` endpoints work; `protectedProcedure` endpoints return UNAUTHORIZED

No changes needed, but verify this flow works end-to-end.

### Task C.1.9 — Unit test for proxy guest page logic

**File:** `src/proxy.test.ts` or manual verification

Test cases:
- Unauthenticated request to `/prices` → allowed through (200, not redirect)
- Unauthenticated request to `/calculator` → allowed through
- Unauthenticated request to `/` → redirect to `/login?callbackUrl=/`
- Unauthenticated request to `/alerts` → redirect to `/login?callbackUrl=/alerts`
- Authenticated request to `/` → allowed through (no redirect)
- Authenticated request to `/prices` → allowed through

---

## 5. Milestone C.2 — Multiple Named Portfolios (P1)

**Goal:** Users can create named portfolios, assign assets to them, and see both per-portfolio and consolidated views.  
**Largest scope item in all of v2. Depends on C.1 being complete (for merged release).**

### Task C.2.1 — `Portfolio` Prisma model + migration

**File:** `prisma/schema.prisma` (modified)

Add the `Portfolio` model:

```prisma
model Portfolio {
  id        String              @id @default(cuid())
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String
  emoji     String?
  createdAt DateTime            @default(now())
  assets    UserAsset[]
  snapshots PortfolioSnapshot[]

  @@index([userId])
}
```

Add relation to `User` model:

```prisma
model User {
  // ... existing fields ...
  portfolios Portfolio[]
}
```

### Task C.2.2 — Add `portfolioId` FK to `UserAsset`

**File:** `prisma/schema.prisma` (modified)

```prisma
model UserAsset {
  id          String    @id @default(cuid())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String
  symbol      String
  quantity    Decimal   @db.Decimal(24, 8)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, symbol, portfolioId])
  @@index([userId])
  @@index([portfolioId])
}
```

**Breaking change:** The `@@unique([userId, symbol])` constraint becomes `@@unique([userId, symbol, portfolioId])`. This allows the same symbol to exist in different portfolios.

### Task C.2.3 — Add `portfolioId` FK to `PortfolioSnapshot`

**File:** `prisma/schema.prisma` (modified)

```prisma
model PortfolioSnapshot {
  id          String     @id @default(cuid())
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  portfolio   Portfolio? @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String?
  snapshotAt  DateTime   @default(now())
  totalIRT    Decimal    @db.Decimal(24, 2)
  breakdown   Json

  @@index([userId, snapshotAt(sort: Desc)])
  @@index([portfolioId, snapshotAt(sort: Desc)])
}
```

`portfolioId` is nullable:
- `null` → consolidated snapshot (sum of all portfolios)
- Specific ID → snapshot for that single portfolio

### Task C.2.4 — Data migration script

**File:** `prisma/migrations/XXXXXXXXXX_add_portfolios/migration.sql` (auto-generated by Prisma) + `scripts/migrate-default-portfolios.ts` (new)

The migration must:

1. Create the `Portfolio` table
2. Add nullable `portfolioId` columns to `UserAsset` and `PortfolioSnapshot`
3. Run the data migration:

```typescript
// scripts/migrate-default-portfolios.ts
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  // Find all users who have assets
  const usersWithAssets = await db.user.findMany({
    where: { assets: { some: {} } },
    select: { id: true },
  })

  for (const user of usersWithAssets) {
    // Create default portfolio
    const portfolio = await db.portfolio.create({
      data: {
        userId: user.id,
        name: 'سبد من',
        emoji: '💼',
      },
    })

    // Assign all existing assets to the default portfolio
    await db.userAsset.updateMany({
      where: { userId: user.id, portfolioId: null },
      data: { portfolioId: portfolio.id },
    })

    // Assign all existing snapshots as consolidated (keep null)
    // No change needed — existing snapshots with null portfolioId
    // already represent consolidated view
  }

  console.log(`Migrated ${usersWithAssets.length} users`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
```

4. After data migration completes, update the schema to make `UserAsset.portfolioId` required (non-nullable)
5. Drop the old `@@unique([userId, symbol])` and add `@@unique([userId, symbol, portfolioId])`

**Migration sequence:**
```
Step 1: prisma migrate → add Portfolio table, add nullable portfolioId columns
Step 2: run scripts/migrate-default-portfolios.ts
Step 3: prisma migrate → make UserAsset.portfolioId non-nullable, update unique constraint
```

In practice with Prisma, steps 1 and 3 can be combined into a single migration if we include a SQL `DO` block that creates default portfolios and assigns assets. Alternatively, use two separate migrations with the script run between them.

**Recommendation:** Use a single Prisma migration that includes raw SQL for the data migration:

```sql
-- Create default portfolio for each user with assets
INSERT INTO "Portfolio" (id, "userId", name, emoji, "createdAt")
SELECT gen_random_uuid()::text, u.id, 'سبد من', '💼', NOW()
FROM "User" u
WHERE EXISTS (SELECT 1 FROM "UserAsset" ua WHERE ua."userId" = u.id);

-- Assign all existing assets to their user's default portfolio
UPDATE "UserAsset" ua
SET "portfolioId" = p.id
FROM "Portfolio" p
WHERE p."userId" = ua."userId"
AND ua."portfolioId" IS NULL;
```

Then make `portfolioId` NOT NULL in the same migration.

### Task C.2.5 — `portfolio.list` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
list: protectedProcedure.query(async ({ ctx }) => {
  const portfolios = await ctx.db.portfolio.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      emoji: true,
      createdAt: true,
      _count: { select: { assets: true } },
    },
  })

  return portfolios.map((p) => ({
    ...p,
    assetCount: p._count.assets,
  }))
})
```

Returns all portfolios for the user with asset count (useful for UI display and delete confirmation).

### Task C.2.6 — `portfolio.create` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
create: protectedProcedure
  .input(
    z.object({
      name: z.string().min(1).max(50),
      emoji: z.string().max(4).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const count = await ctx.db.portfolio.count({
      where: { userId: ctx.user.id },
    })

    if (count >= MAX_PORTFOLIOS) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `حداکثر ${MAX_PORTFOLIOS} سبد مجاز است`,
      })
    }

    return ctx.db.portfolio.create({
      data: {
        userId: ctx.user.id,
        name: input.name,
        emoji: input.emoji ?? null,
      },
    })
  })
```

**Limit:** `MAX_PORTFOLIOS = 10` — prevents abuse and keeps the UI manageable.

### Task C.2.7 — `portfolio.rename` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
rename: protectedProcedure
  .input(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1).max(50),
      emoji: z.string().max(4).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await requireOwnedPortfolio(ctx.db, input.id, ctx.user.id)

    return ctx.db.portfolio.update({
      where: { id: input.id },
      data: {
        name: input.name,
        ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
      },
    })
  })
```

`requireOwnedPortfolio` follows the same pattern as `requireOwnedAsset` and `requireOwnedAlert`.

### Task C.2.8 — `portfolio.delete` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
delete: protectedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    const portfolio = await requireOwnedPortfolio(ctx.db, input.id, ctx.user.id)

    // Count total portfolios — prevent deleting the last one
    const totalPortfolios = await ctx.db.portfolio.count({
      where: { userId: ctx.user.id },
    })

    if (totalPortfolios <= 1) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'حداقل یک سبد باید وجود داشته باشد',
      })
    }

    // Cascade delete will remove all assets and snapshots in this portfolio
    await ctx.db.portfolio.delete({
      where: { id: input.id },
    })

    // Recreate consolidated snapshot without this portfolio's assets
    void createPortfolioSnapshot(ctx.db, ctx.user.id, null)
  })
```

The `onDelete: Cascade` on `UserAsset` and `PortfolioSnapshot` relations means deleting a portfolio automatically deletes all its assets and per-portfolio snapshots. The consolidated snapshot is then regenerated.

**Important:** The UI must show a confirmation modal before calling this, especially if the portfolio contains assets. The confirmation should list the number of assets that will be deleted.

### Task C.2.9 — Modify `assets.add` to accept `portfolioId`

**File:** `src/server/api/routers/assets.ts` (modified)

Currently `assets.add` upserts on the Prisma-generated compound unique `userId_symbol`:

```typescript
// CURRENT — will change
where: { userId_symbol: { userId: ctx.user.id, symbol: input.symbol } }
```

After schema migration (C.2.2), the unique constraint becomes `(userId, symbol, portfolioId)`, so the upsert key must include `portfolioId`:

```typescript
add: protectedProcedure
  .input(
    z.object({
      symbol: z.string().min(1),
      quantity: quantitySchema,
      portfolioId: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await requireOwnedPortfolio(ctx.db, input.portfolioId, ctx.user.id)

    const asset = await ctx.db.userAsset.upsert({
      where: {
        userId_symbol_portfolioId: {
          userId: ctx.user.id,
          symbol: input.symbol,
          portfolioId: input.portfolioId,
        },
      },
      update: { quantity: input.quantity },
      create: {
        userId: ctx.user.id,
        portfolioId: input.portfolioId,
        symbol: input.symbol,
        quantity: input.quantity,
      },
    })

    // Snapshot the specific portfolio AND the consolidated view
    void createPortfolioSnapshot(ctx.db, ctx.user.id, input.portfolioId)
    void createPortfolioSnapshot(ctx.db, ctx.user.id, null)

    return asset
  })
```

The `portfolioId` is now required. The add asset page must know which portfolio is currently selected.

**Note:** The `AssetPicker` component (`src/components/asset-picker.tsx`) calls `api.assets.add.useMutation({ symbol, quantity })`. It needs to be updated to accept and pass `portfolioId`.

### Task C.2.10 — Modify `assets.list` to accept optional `portfolioId`

**File:** `src/server/api/routers/assets.ts` (modified)

```typescript
list: protectedProcedure
  .input(
    z.object({
      portfolioId: z.string().min(1).optional(),
    }).optional(),
  )
  .query(async ({ ctx, input }) => {
    const whereClause = input?.portfolioId
      ? { userId: ctx.user.id, portfolioId: input.portfolioId }
      : { userId: ctx.user.id }

    const [userAssets, snapshot] = await Promise.all([
      ctx.db.userAsset.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
      }),
      ctx.db.priceSnapshot.findFirst({
        orderBy: { snapshotAt: 'desc' },
      }),
    ])

    // ... rest of enrichment logic unchanged ...
  })
```

When `portfolioId` is omitted → returns all assets across all portfolios (consolidated view).  
When `portfolioId` is provided → returns only assets in that portfolio.

### Task C.2.11 — Modify `portfolio.history`, `portfolio.delta`, `portfolio.breakdown` to accept optional `portfolioId`

**File:** `src/server/api/routers/portfolio.ts` (modified)

All three procedures get an optional `portfolioId` input:

```typescript
// Example for portfolio.delta
delta: protectedProcedure
  .input(
    z.object({
      window: z.enum(['1D', '1W', '1M', 'ALL']).default('1D'),
      portfolioId: z.string().min(1).optional(),
    }).optional(),
  )
  .query(async ({ ctx, input }) => {
    const window = input?.window ?? '1D'
    const portfolioFilter = input?.portfolioId
      ? { portfolioId: input.portfolioId }
      : { portfolioId: null }  // null = consolidated

    const current = await ctx.db.portfolioSnapshot.findFirst({
      where: { userId: ctx.user.id, ...portfolioFilter },
      orderBy: { snapshotAt: 'desc' },
      // ...
    })
    // ... rest unchanged ...
  })
```

The same pattern applies to `history` and `breakdown`. When `portfolioId` is omitted, query consolidated snapshots (`portfolioId: null`).

### Task C.2.12 — Update `createPortfolioSnapshot` for multi-portfolio

**File:** `src/lib/portfolio.ts` (modified)

```typescript
export async function createPortfolioSnapshot(
  db: PrismaClient,
  userId: string,
  portfolioId: string | null,  // null = consolidated
): Promise<PortfolioSnapshot | null> {
  const whereClause = portfolioId
    ? { userId, portfolioId }
    : { userId }

  const [userAssets, priceSnapshot] = await Promise.all([
    db.userAsset.findMany({ where: whereClause }),
    db.priceSnapshot.findFirst({ orderBy: { snapshotAt: 'desc' } }),
  ])

  if (userAssets.length === 0 || !priceSnapshot) return null

  // Dedup check — include portfolioId in the check
  const dedupSince = new Date()
  dedupSince.setMinutes(dedupSince.getMinutes() - DEDUP_WINDOW_MINUTES)
  const recent = await db.portfolioSnapshot.findFirst({
    where: {
      userId,
      portfolioId: portfolioId ?? null,
      snapshotAt: { gte: dedupSince },
    },
  })
  if (recent) return null

  const prices = parsePriceSnapshot(priceSnapshot.data)

  const breakdown: Array<{ symbol: string; quantity: number; valueIRT: number }> = []
  let totalIRT = 0

  for (const asset of userAssets) {
    const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
    const qty = Number(asset.quantity)
    const valueIRT = qty * sellPrice
    totalIRT += valueIRT
    breakdown.push({ symbol: asset.symbol, quantity: qty, valueIRT })
  }

  return db.portfolioSnapshot.create({
    data: { userId, portfolioId, totalIRT, breakdown },
  })
}
```

### Task C.2.13 — Update portfolio cron for multi-portfolio

**File:** `src/app/api/cron/portfolio/route.ts` (modified)

The cron must create snapshots for each portfolio AND a consolidated snapshot:

```typescript
for (const user of activeUsers) {
  // Get all portfolios for this user
  const portfolios = await db.portfolio.findMany({
    where: { userId: user.id },
    select: { id: true },
  })

  // Create per-portfolio snapshots
  for (const portfolio of portfolios) {
    await createPortfolioSnapshot(db, user.id, portfolio.id)
  }

  // Create consolidated snapshot
  const snap = await createPortfolioSnapshot(db, user.id, null)
  if (snap) portfolioSnapshotCount++
}
```

The PORTFOLIO alert evaluation and daily digest logic already use the consolidated snapshot (they query by `userId` without `portfolioId`), so they should continue to work with the consolidated (`portfolioId: null`) snapshots.

### Task C.2.14 — Portfolio selector component

**File:** `src/components/portfolio-selector.tsx` (new)

A dropdown at the top of the My Assets page for switching the active portfolio:

```typescript
interface PortfolioSelectorProps {
  portfolios: Array<{ id: string; name: string; emoji: string | null; assetCount: number }>
  selectedId: string | null  // null = consolidated
  onSelect: (portfolioId: string | null) => void
  onCreate: () => void
}
```

Uses HeroUI `Select` component with:
- A "Consolidated" option (always first, with 📊 emoji)
- Each portfolio with its emoji + name + asset count badge
- A "New Portfolio" action item at the bottom (styled differently, triggers `onCreate`)

### Task C.2.15 — Create/Rename portfolio modal

**File:** `src/components/portfolio-form-modal.tsx` (new)

A modal for creating and renaming portfolios:

```typescript
interface PortfolioFormModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'rename'
  portfolio?: { id: string; name: string; emoji: string | null }
}
```

Contains:
- Text input for portfolio name (max 50 chars)
- Optional emoji picker (or simple text input for emoji)
- Save / Cancel buttons
- Uses `useTelegramMainButton` for the save action in mini app mode

### Task C.2.16 — Delete portfolio confirmation modal

**File:** `src/components/portfolio-delete-modal.tsx` (new)

A confirmation modal shown before deleting a portfolio:

```typescript
interface PortfolioDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  portfolio: { id: string; name: string; assetCount: number }
}
```

Shows a warning:
- "Are you sure you want to delete '{name}'?"
- "This will also delete {assetCount} assets in this portfolio."
- Red "Delete" button + "Cancel" button

### Task C.2.17 — Integrate portfolio selector into My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

```typescript
// New state
const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)

// Fetch portfolios
const portfoliosQuery = api.portfolio.list.useQuery()

// Pass portfolioId to all queries
const { data } = api.assets.list.useQuery(
  selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
  { refetchInterval: 30 * 60 * 1000 },
)

const historyQuery = api.portfolio.history.useQuery(
  { days: 30, ...(selectedPortfolioId ? { portfolioId: selectedPortfolioId } : {}) },
  { refetchInterval: 30 * 60 * 1000 },
)

// Similar for delta and breakdown queries
```

The portfolio selector appears at the top of the hero section, above the total:

```tsx
<Section header={tNav('assets')} variant="hero">
  {portfoliosQuery.data && portfoliosQuery.data.length > 1 && (
    <PortfolioSelector
      portfolios={portfoliosQuery.data}
      selectedId={selectedPortfolioId}
      onSelect={setSelectedPortfolioId}
      onCreate={() => setShowCreateModal(true)}
    />
  )}
  <PortfolioTotal ... />
  <PortfolioDelta ... />
</Section>
```

The selector is **only shown when the user has more than 1 portfolio**. Users with a single portfolio (the default) see the same UI as before — no visual change.

**Note:** The `computeBiggestMover(data.assets, locale)` call in the page already takes a `locale` parameter for bilingual display names. No change needed for the biggest mover computation with multi-portfolio — it operates on whatever assets are currently shown (filtered by `selectedPortfolioId` or all).

**Note:** The FAB "Add Asset" button must pass the current `selectedPortfolioId` (or the default portfolio ID for single-portfolio users):

```tsx
<Button onPress={() => {
  const pid = selectedPortfolioId || portfoliosQuery.data?.[0]?.id
  router.push(`/assets/add${pid ? `?portfolioId=${pid}` : ''}`)
}}>
```

### Task C.2.18 — Update Add Asset page and AssetPicker to pass `portfolioId`

**Files:** `src/app/(app)/assets/add/page.tsx` (modified), `src/components/asset-picker.tsx` (modified)

The add asset page must know which portfolio to add the asset to. Options:

1. **Query parameter**: `/assets/add?portfolioId=xyz` — pass via URL
2. **Global state**: React context or Zustand store
3. **Default portfolio**: Always add to the user's default (first) portfolio; let them move assets later

Choosing **Option 1** — simple, stateless, works with back/forward navigation:

```typescript
// src/app/(app)/assets/add/page.tsx
const searchParams = useSearchParams()
const portfolioId = searchParams.get('portfolioId')
```

The "Add Asset" FAB on the My Assets page passes the currently selected portfolio:

```tsx
<Button onPress={() => router.push(`/assets/add?portfolioId=${selectedPortfolioId || defaultPortfolioId}`)}>
  {t('addAsset')}
</Button>
```

The `portfolioId` is threaded through to `AssetPicker`:

```tsx
// src/app/(app)/assets/add/page.tsx
<AssetPicker priceData={data.data} portfolioId={portfolioId} onSaved={() => router.push('/')} />
```

And `AssetPicker` must be updated to accept and use `portfolioId`:

```typescript
// src/components/asset-picker.tsx
interface AssetPickerProps {
  priceData: unknown
  portfolioId: string  // NEW — required
  onSaved: () => void
}

// In the add mutation call:
addMutation.mutate({ symbol, quantity, portfolioId: props.portfolioId })
```

### Task C.2.19 — Update `assets.update` and `assets.delete` procedures

**File:** `src/server/api/routers/assets.ts` (modified)

The `update` and `delete` procedures don't need new input parameters — they operate by asset `id` which is globally unique. However, `requireOwnedAsset()` already returns the full asset record (including the new `portfolioId` field), so we use it to snapshot both the specific portfolio and the consolidated view:

```typescript
update: protectedProcedure
  .input(z.object({ id: z.string().min(1), quantity: quantitySchema }))
  .mutation(async ({ ctx, input }) => {
    const asset = await requireOwnedAsset(ctx.db, input.id, ctx.user.id)
    const updated = await ctx.db.userAsset.update({
      where: { id: input.id, userId: ctx.user.id },
      data: { quantity: input.quantity },
    })

    // Snapshot both the specific portfolio and consolidated
    void createPortfolioSnapshot(ctx.db, ctx.user.id, asset.portfolioId)
    void createPortfolioSnapshot(ctx.db, ctx.user.id, null)

    return updated
  })
```

Same pattern for `delete`. The current `void createPortfolioSnapshot(ctx.db, ctx.user.id)` calls become two calls: one for the specific portfolio, one for consolidated (`null`).

---

## 6. Milestone C.3 — CSV Export (P1)

**Goal:** Users can download their portfolio snapshot history as a CSV file.  
**No schema changes. Quick win.**

### Task C.3.1 — `portfolio.export` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
export: protectedProcedure
  .input(
    z.object({
      portfolioId: z.string().min(1).optional(),
    }).optional(),
  )
  .query(async ({ ctx, input }) => {
    const portfolioFilter = input?.portfolioId
      ? { portfolioId: input.portfolioId }
      : { portfolioId: null }

    const snapshots = await ctx.db.portfolioSnapshot.findMany({
      where: { userId: ctx.user.id, ...portfolioFilter },
      orderBy: { snapshotAt: 'asc' },
      select: {
        snapshotAt: true,
        totalIRT: true,
        breakdown: true,
      },
    })

    // Get latest price snapshot for USD conversion
    const priceSnap = await ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })
    const prices = parsePriceSnapshot(priceSnap?.data)
    const usdSellPrice = getSellPriceBySymbol('USD', prices)

    // Build CSV
    const header = 'date,totalIRT,totalUSD,breakdown_json'
    const rows = snapshots.map((s) => {
      const totalIRT = Number(s.totalIRT)
      const totalUSD = usdSellPrice > 0 ? (totalIRT / usdSellPrice).toFixed(2) : ''
      const date = s.snapshotAt.toISOString().split('T')[0]
      const breakdown = JSON.stringify(s.breakdown).replace(/"/g, '""')
      return `${date},${totalIRT},"${totalUSD}","${breakdown}"`
    })

    const csv = [header, ...rows].join('\n')
    return { csv, rowCount: snapshots.length }
  })
```

Returns the CSV as a string. The client handles the download trigger.

**Note on totalUSD:** Uses the *current* USD sell price for all rows (not the historical price at each snapshot). This is a simplification — historical USD conversion would require storing USD price in each snapshot or cross-referencing PriceSnapshot by date. The PRD doesn't specify historical accuracy for USD in the export.

### Task C.3.2 — CSV download utility

**File:** `src/lib/csv-download.ts` (new)

```typescript
import { isTelegramWebApp } from '@/utils/telegram'

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  if (isTelegramWebApp()) {
    // Telegram mini app — try openLink
    try {
      window.Telegram?.WebApp?.openLink(url)
    } catch {
      // Fallback to regular download
      triggerDownload(url, filename)
    }
  } else {
    triggerDownload(url, filename)
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
```

The `\uFEFF` BOM prefix ensures Excel correctly interprets the UTF-8 encoding (important for Persian text in the breakdown JSON).

### Task C.3.3 — Export trigger UI

**File:** `src/app/(app)/page.tsx` (modified)

Add an export button in the My Assets page header area. Use an icon button (download icon) in the hero section or a menu item:

```typescript
const exportQuery = api.portfolio.export.useQuery(
  selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
  { enabled: false },  // Don't fetch automatically — only on demand
)

const handleExport = async () => {
  const result = await exportQuery.refetch()
  if (result.data) {
    const date = new Date().toISOString().split('T')[0]!.replace(/-/g, '')
    downloadCSV(result.data.csv, `cheghadr-export-${date}.csv`)
  }
}
```

Render as an icon button:

```tsx
<Button
  isIconOnly
  variant="ghost"
  size="sm"
  onPress={handleExport}
  isLoading={exportQuery.isFetching}
  aria-label={t('export')}
>
  <IconDownload size={18} />
</Button>
```

Position: next to the portfolio selector or in the hero section header.

### Task C.3.4 — Empty export handling

If the user has no portfolio snapshots, the export returns `{ csv: header-only, rowCount: 0 }`. The UI should show a toast message "No data to export" instead of downloading an empty file.

```typescript
const handleExport = async () => {
  const result = await exportQuery.refetch()
  if (result.data && result.data.rowCount > 0) {
    downloadCSV(result.data.csv, `cheghadr-export-${date}.csv`)
    toast.success(t('exportSuccess', { count: result.data.rowCount }))
  } else {
    toast.info(t('exportEmpty'))
  }
}
```

---

## 7. New & Modified tRPC Procedures

### New procedures

| Router | Procedure | Type | Auth | Input | Output |
|---|---|---|---|---|---|
| `portfolio` | `list` | query | protected | — | `Array<{ id, name, emoji, assetCount }>` |
| `portfolio` | `create` | mutation | protected | `{ name, emoji? }` | `Portfolio` |
| `portfolio` | `rename` | mutation | protected | `{ id, name, emoji? }` | `Portfolio` |
| `portfolio` | `delete` | mutation | protected | `{ id }` | void |
| `portfolio` | `export` | query | protected | `{ portfolioId? }` | `{ csv, rowCount }` |

### Modified procedures

| Router | Procedure | Change |
|---|---|---|
| `assets` | `list` | Add optional `portfolioId` input filter |
| `assets` | `add` | Add required `portfolioId` input; change upsert key to include `portfolioId` |
| `assets` | `update` | Snapshot both specific portfolio and consolidated after mutation |
| `assets` | `delete` | Snapshot both specific portfolio and consolidated after mutation |
| `portfolio` | `history` | Add optional `portfolioId` input; query by `portfolioId` (null = consolidated) |
| `portfolio` | `delta` | Add optional `portfolioId` input; query by `portfolioId` (null = consolidated) |
| `portfolio` | `breakdown` | Add optional `portfolioId` input; query by `portfolioId` (null = consolidated) |

---

## 8. Schema Changes Summary

### New model

```prisma
model Portfolio {
  id        String              @id @default(cuid())
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  name      String
  emoji     String?
  createdAt DateTime            @default(now())
  assets    UserAsset[]
  snapshots PortfolioSnapshot[]

  @@index([userId])
}
```

### Modified models

**User** — add `portfolios` relation (current model already has `preferredLocale: PreferredLocale @default(fa)`):
```prisma
portfolios Portfolio[]
```

**UserAsset** — add FK, change unique constraint:
```prisma
portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
portfolioId String

@@unique([userId, symbol, portfolioId])  // was: @@unique([userId, symbol])
@@index([portfolioId])                   // new index
```

**PortfolioSnapshot** — add nullable FK:
```prisma
portfolio   Portfolio? @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
portfolioId String?

@@index([portfolioId, snapshotAt(sort: Desc)])  // new index
```

### Migration steps

1. Add `Portfolio` table
2. Add nullable `portfolioId` to `UserAsset` and `PortfolioSnapshot`
3. Data migration: create default portfolio per user, assign existing assets
4. Make `UserAsset.portfolioId` NOT NULL
5. Drop old unique constraint, add new one with `portfolioId`
6. Add indexes

---

## 9. New i18n Keys

### `fa.json` additions

```json
{
  "guest": {
    "ctaBanner": "📊 سبد دارایی خود را دنبال کنید — ورود با تلگرام",
    "loginPrompt": "برای دیدن دارایی‌ها وارد شوید"
  },
  "login": {
    "subtitlePortfolio": "برای پیگیری سبد دارایی خود وارد شوید"
  },
  "portfolios": {
    "consolidated": "همه سبدها",
    "newPortfolio": "سبد جدید",
    "createTitle": "ایجاد سبد",
    "renameTitle": "تغییر نام سبد",
    "deleteTitle": "حذف سبد",
    "deleteConfirm": "آیا مطمئنید؟ {count} دارایی در این سبد حذف خواهد شد.",
    "deleteLastError": "حداقل یک سبد باید وجود داشته باشد",
    "maxReached": "حداکثر {max} سبد مجاز است",
    "name": "نام سبد",
    "namePlaceholder": "مثلاً پس‌انداز",
    "emoji": "ایموجی",
    "save": "ذخیره",
    "cancel": "لغو",
    "delete": "حذف",
    "toastCreated": "سبد ایجاد شد",
    "toastRenamed": "سبد تغییر نام یافت",
    "toastDeleted": "سبد حذف شد",
    "toastCreateError": "خطا در ایجاد سبد",
    "toastRenameError": "خطا در تغییر نام",
    "toastDeleteError": "خطا در حذف سبد"
  },
  "export": {
    "button": "خروجی CSV",
    "success": "{count} ردیف دانلود شد",
    "empty": "داده‌ای برای خروجی وجود ندارد",
    "error": "خطا در خروجی"
  }
}
```

### `en.json` additions

```json
{
  "guest": {
    "ctaBanner": "📊 Track your portfolio — Log in with Telegram",
    "loginPrompt": "Log in to see your assets"
  },
  "login": {
    "subtitlePortfolio": "Log in to track your portfolio"
  },
  "portfolios": {
    "consolidated": "All Portfolios",
    "newPortfolio": "New Portfolio",
    "createTitle": "Create Portfolio",
    "renameTitle": "Rename Portfolio",
    "deleteTitle": "Delete Portfolio",
    "deleteConfirm": "Are you sure? {count} assets in this portfolio will be deleted.",
    "deleteLastError": "You must have at least one portfolio",
    "maxReached": "Maximum {max} portfolios allowed",
    "name": "Portfolio name",
    "namePlaceholder": "e.g. Savings",
    "emoji": "Emoji",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "toastCreated": "Portfolio created",
    "toastRenamed": "Portfolio renamed",
    "toastDeleted": "Portfolio deleted",
    "toastCreateError": "Error creating portfolio",
    "toastRenameError": "Error renaming",
    "toastDeleteError": "Error deleting portfolio"
  },
  "export": {
    "button": "CSV Export",
    "success": "{count} rows downloaded",
    "empty": "No data to export",
    "error": "Export error"
  }
}
```

---

## 10. Dependency Graph & Task Order

```
C.1.1 Modify proxy (guest pages)
  ↓
C.1.2 Login page callbackUrl
  ↓
C.1.3 Contextual login prompt
  ↓
C.1.4 GuestLoginBanner component
  ↓
C.1.5 Add banner to app layout
  ↓
C.1.6 SessionProvider check
  ↓
C.1.7 Verify Prices + Calculator pages
  ↓
C.1.8 Verify mini app guest mode
  ↓
C.1.9 Tests for proxy logic

C.2.1 Portfolio Prisma model ──────────────────────────────────┐
  ↓                                                             │
C.2.2 UserAsset.portfolioId FK                                  │
  ↓                                                             │
C.2.3 PortfolioSnapshot.portfolioId FK                          │
  ↓                                                             │
C.2.4 Data migration script ───────────────────────────────┐    │
  ↓                                                         │    │
C.2.5 portfolio.list tRPC                                   │    │
C.2.6 portfolio.create tRPC                                 │    │
C.2.7 portfolio.rename tRPC                                 │    │
C.2.8 portfolio.delete tRPC                                 │    │
  ↓                                                         │    │
C.2.9 Modify assets.add (portfolioId) ←────────────────────┘    │
C.2.10 Modify assets.list (optional filter)                      │
C.2.11 Modify portfolio.history/delta/breakdown                  │
  ↓                                                              │
C.2.12 Update createPortfolioSnapshot ←─────────────────────────┘
C.2.13 Update portfolio cron
  ↓
C.2.14 PortfolioSelector component
C.2.15 Create/Rename portfolio modal
C.2.16 Delete portfolio confirmation modal
  ↓
C.2.17 Integrate selector into My Assets page
C.2.18 Update Add Asset page (portfolioId param)
C.2.19 Update assets.update/delete (dual snapshots)

C.3.1 portfolio.export tRPC ←── independent of C.2 (works with null portfolioId)
  ↓
C.3.2 CSV download utility
  ↓
C.3.3 Export trigger UI
  ↓
C.3.4 Empty export handling
```

**Parallelism opportunities:**
- **C.1** and **C.3** are fully independent — can be developed in parallel
- **C.2.1–C.2.4** (schema + migration) must be sequential
- **C.2.5–C.2.8** (CRUD procedures) can be developed in parallel after schema migration
- **C.2.9–C.2.13** (modify existing procedures + lib) depends on schema migration
- **C.2.14–C.2.16** (UI components) can be developed in parallel with backend changes (mock data)
- **C.3** can be developed independently and works even without C.2 (uses `portfolioId: null` for consolidated export)

### Suggested implementation order

1. **C.1.1–C.1.3** — Proxy + login page changes (foundation for guest mode)
2. **C.1.4–C.1.6** — Guest banner component + layout integration
3. **C.1.7–C.1.9** — Verification + tests for guest mode
4. **C.3.1–C.3.4** — CSV export (quick win, independent)
5. **C.2.1–C.2.4** — Schema changes + migration (biggest risk item)
6. **C.2.5–C.2.8** — Portfolio CRUD procedures
7. **C.2.9–C.2.13** — Modify existing procedures + snapshot logic
8. **C.2.14–C.2.18** — UI components + page integration
9. **C.2.19** — Final wiring: update/delete dual snapshots

**Rationale:** C.1 first (P0, smallest scope, highest value); C.3 next (quick win, builds confidence); C.2 last (largest scope, most risk, benefits from C.1 and C.3 being done).

---

## 11. Open Questions & Decisions Required

These are decisions that must be resolved before or during implementation. Recommended resolutions are provided.

| # | Question | From | Recommendation | Blocking? |
|---|---|---|---|---|
| 1 | Should the portfolio selector be a dropdown, tabs, or a bottom sheet? (PRD Open Question #6) | Design | **Dropdown** — scales better with many portfolios, less layout disruption. See AD-7. | Yes — blocks C.2.14 |
| 2 | Should deleting a portfolio move its assets to another portfolio, or delete them? | Engineering | **Delete assets** (with cascade) — simpler, matches PRD acceptance criteria. Show clear warning with asset count. | No — default cascade |
| 3 | Should the CSV export use historical USD prices per snapshot, or current USD price for all rows? | Product | **Current USD price** for v2 (simpler). Note the approximation in the CSV header or a comment row. | No — simplification acceptable |
| 4 | For the data migration: should the default portfolio name be localized (`سبد من` for Persian users)? | Engineering | **Use `سبد من` (Persian)** — all current users are Persian. If we later add locale to the User model, we can use it. | No — pick a sensible default |
| 5 | Should the portfolio selector be hidden for single-portfolio users? | Design | **Yes** — no visual noise until the user creates a second portfolio. The "New Portfolio" action can live in a settings/menu instead. | No — recommended UX |
| 6 | Maximum number of portfolios per user? | Engineering | **10** — prevents abuse, keeps UI manageable. Can be raised later. | No — start with a reasonable limit |
| 7 | Should the CSV export include per-asset detail rows, or just daily totals? (PRD Open Question #7) | Product | **Daily totals** for v2 (matches PRD format: `date, totalIRT, totalUSD, breakdown_json`). The `breakdown_json` column provides per-asset detail for power users who parse JSON. | No — PRD provides format |
| 8 | How should the guest banner dismiss? Auto-hide after login? Dismissible with an X? | Design | **Auto-hide after login** (session state drives visibility). No manual dismiss — we want the CTA always visible for guests. | No — minor UX detail |

---

## 12. Testing Strategy

### Unit tests (Vitest)

| Module | Test file | Key test cases |
|---|---|---|
| `downloadCSV` | `csv-download.test.ts` | Blob creation with BOM, filename, Telegram vs standalone path |
| `createPortfolioSnapshot` | `portfolio.test.ts` | With/without portfolioId, dedup, empty assets |
| Proxy guest logic | Manual or integration test | Guest paths allowed, auth paths redirect with callbackUrl |

### Integration testing

| Feature | Test approach |
|---|---|
| Guest mode proxy | Start dev server, access `/prices` without auth → should load; access `/` without auth → should redirect to `/login?callbackUrl=/` |
| Portfolio CRUD | Seed DB, call `portfolio.create/list/rename/delete` via tRPC caller; verify DB state |
| Multi-portfolio assets | Create two portfolios, add same symbol to each, verify both exist |
| CSV export | Create snapshots, call `portfolio.export`, verify CSV format and row count |
| Data migration | Run migration on test DB with existing users/assets, verify default portfolios created |

### Manual testing

1. **Guest mode — standalone web:**
   - Open `/prices` in a browser without any session → verify prices load
   - Open `/calculator` → verify it works
   - Tap "My Assets" tab → verify redirect to login with contextual message
   - Log in → verify redirect back to My Assets
   - Verify sticky CTA banner appears on Prices/Calculator for guests
   - Verify banner disappears after login

2. **Guest mode — mini app:**
   - Open the mini app link in a browser (not Telegram) → verify Prices + Calculator work
   - Verify My Assets redirects to login

3. **Multiple portfolios:**
   - Create a second portfolio → verify selector appears
   - Add assets to different portfolios → verify per-portfolio totals
   - Switch between portfolios → verify correct assets shown
   - View consolidated → verify sum of all portfolios
   - Delete a portfolio with assets → verify confirmation modal, then deletion
   - Try to delete the last portfolio → verify error message

4. **CSV export:**
   - With portfolio history → export → verify file downloads with correct name and content
   - With no history → export → verify "no data" toast
   - In Telegram mini app → verify download works (or falls back gracefully)

5. **RTL + dark mode:**
   - Verify portfolio selector, modals, and guest banner render correctly in RTL
   - Verify dark mode colors and contrast

### Commands

```bash
pnpm test                    # Run all unit tests
pnpm typecheck               # TypeScript validation
pnpm lint                    # Biome lint
pnpm check                   # typecheck + lint
```

---

## 13. Definition of Done

### C.1 — Guest Mode ✅

- [ ] `/prices` and `/calculator` accessible without authentication in both standalone web and mini app
- [ ] `prices.latest` tRPC procedure remains public (already is — verify no regression)
- [ ] Guest user tapping "My Assets" is redirected to `/login` with `callbackUrl=/`
- [ ] Login page shows contextual "Log in to track your portfolio" when redirected from My Assets
- [ ] After login, user is redirected back to the intended page (not always `/`)
- [ ] Standalone web: sticky login CTA banner visible for guest users on Prices and Calculator
- [ ] CTA banner hidden for authenticated users and in Telegram mini app mode
- [ ] No server-side session is created for guest users
- [ ] No console errors for guest users on Prices or Calculator pages
- [ ] Guest on Prices page sees live data and no login prompt until tapping My Assets

### C.2 — Multiple Named Portfolios ✅

- [ ] `Portfolio` Prisma model created with `name`, `emoji`, `userId` fields
- [ ] `UserAsset.portfolioId` FK added; unique constraint updated to `(userId, symbol, portfolioId)`
- [ ] `PortfolioSnapshot.portfolioId` FK added (nullable — null = consolidated)
- [ ] Data migration: default portfolio auto-created for all existing users; all existing assets assigned
- [ ] `portfolio.list` returns all portfolios with asset counts
- [ ] `portfolio.create` creates a new portfolio (max 10 per user)
- [ ] `portfolio.rename` updates name and/or emoji
- [ ] `portfolio.delete` deletes portfolio + cascades assets + shows confirmation
- [ ] Cannot delete the last portfolio — error shown
- [ ] `assets.list` accepts optional `portfolioId` filter
- [ ] `assets.add` requires `portfolioId`; upserts correctly with new unique constraint
- [ ] `portfolio.history`, `delta`, `breakdown` accept optional `portfolioId`
- [ ] `createPortfolioSnapshot` handles per-portfolio and consolidated snapshots
- [ ] Portfolio cron creates per-portfolio and consolidated snapshots for all active users
- [ ] Portfolio selector UI appears only when user has > 1 portfolio
- [ ] Consolidated view shows total across all portfolios
- [ ] Switching portfolio updates all data (assets list, chart, delta, breakdown)
- [ ] Add Asset page passes `portfolioId` to the mutation
- [ ] PORTFOLIO alerts and daily digest continue to work with consolidated snapshots

### C.3 — CSV Export ✅

- [ ] `portfolio.export` returns CSV with format: `date, totalIRT, totalUSD, breakdown_json`
- [ ] Export includes all historical snapshots (up to 365 days)
- [ ] CSV file has UTF-8 BOM for Excel compatibility
- [ ] File name follows format: `cheghadr-export-YYYYMMDD.csv`
- [ ] Export works in standalone web (blob download)
- [ ] Export works in Telegram mini app (`openLink` or fallback)
- [ ] Empty export shows toast message, does not download empty file
- [ ] Export button visible in My Assets page header

### Cross-cutting ✅

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No console errors in development
- [ ] All new i18n keys added to both `fa.json` and `en.json`
- [ ] All new components render correctly in RTL layout
- [ ] All components respect light/dark mode
- [ ] Conventional commits used throughout
- [ ] Migration tested on staging before production

---

## File Change Summary

### New files

| File | Purpose |
|---|---|
| `src/components/guest-login-banner.tsx` | Sticky CTA banner for unauthenticated standalone web guests |
| `src/components/portfolio-selector.tsx` | Dropdown for switching active portfolio |
| `src/components/portfolio-form-modal.tsx` | Create/rename portfolio modal |
| `src/components/portfolio-delete-modal.tsx` | Delete portfolio confirmation modal |
| `src/lib/csv-download.ts` | Client-side CSV download utility |
| `scripts/migrate-default-portfolios.ts` | Data migration script (if not using raw SQL in Prisma migration) |

### Modified files

| File | Change |
|---|---|
| `src/proxy.ts` | Allow `/prices` and `/calculator` without auth; add `callbackUrl` to redirect |
| `src/app/login/page.tsx` | Handle `callbackUrl` param; contextual subtitle for portfolio redirect |
| `src/app/(app)/layout.tsx` | Add `GuestLoginBanner` component |
| `prisma/schema.prisma` | Add `Portfolio` model; add FKs to `UserAsset` and `PortfolioSnapshot`; update constraints |
| `src/server/api/routers/portfolio.ts` | Add `list`, `create`, `rename`, `delete`, `export`; modify `history`, `delta`, `breakdown` for `portfolioId` |
| `src/server/api/routers/assets.ts` | Modify `list` for optional `portfolioId`; modify `add` for required `portfolioId`; dual snapshots on update/delete |
| `src/lib/portfolio.ts` | Update `createPortfolioSnapshot` for multi-portfolio support |
| `src/app/api/cron/portfolio/route.ts` | Create per-portfolio + consolidated snapshots |
| `src/app/(app)/page.tsx` | Add portfolio selector, portfolio switching state, export button |
| `src/app/(app)/assets/add/page.tsx` | Read `portfolioId` from URL params, pass to `AssetPicker` |
| `src/components/asset-picker.tsx` | Accept `portfolioId` prop, pass to `assets.add` mutation |
| `src/components/client-root.tsx` | Add `SessionProvider` as outermost provider |
| `messages/fa.json` | Add `guest`, `portfolios`, `export` namespaces; add `login.subtitlePortfolio` |
| `messages/en.json` | Add `guest`, `portfolios`, `export` namespaces; add `login.subtitlePortfolio` |
