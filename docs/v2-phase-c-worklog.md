# v2 Phase C Worklog — Surface Expansion

> **Branch:** `cursor/docs-v2-phase-c-plan-cb7c`  
> **Base:** `master` @ `9375802` (Phase B complete)  
> **Completed:** Thu 20 Mar 2026  
> **Commits:** `b91ea84`, `cd0adc6`, `6ab6a11`

---

## What Was Built

All three milestones from `docs/v2-phase-c-plan.md` were implemented. C.1 (Guest Mode) and C.3 (CSV Export) required no schema changes. C.2 (Multiple Named Portfolios) added a new `Portfolio` model with FKs on `UserAsset` and `PortfolioSnapshot`, applied to the live Neon DB in a two-stage migration with an intermediate data-migration script.

---

## Commit 1 — `b91ea84` `feat: implement v2 phase C — guest mode, multi-portfolio, CSV export`

Full implementation of all three milestones, 23 files changed (6 new, 17 modified), 1,107 insertions, 166 deletions.

---

### Milestone C.1 — Guest Mode (P0)

#### `src/proxy.ts` — guest page whitelist + `callbackUrl`

Added `isGuestPage` check for `/prices` and `/calculator` so the proxy lets those routes through without a session. Changed the unauthenticated redirect to carry the intended destination:

```typescript
const isGuestPage = pathname === '/prices' || pathname === '/calculator'
if (isLoginPage || isApiRoute || isGuestPage) return NextResponse.next()

if (!req.auth) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', pathname)
  return NextResponse.redirect(loginUrl)
}
```

Previously the redirect went to `/login` with no context; now every auth-gated redirect preserves the user's intended destination.

#### `src/app/login/page.tsx` — `callbackUrl` handling + contextual subtitle

Added `useSearchParams()` to read `callbackUrl` from the URL. Added open-redirect protection — only paths starting with `/` and not `//` are accepted:

```typescript
const rawCallback = searchParams.get('callbackUrl') ?? '/'
const isSafeCallback = rawCallback.startsWith('/') && !rawCallback.startsWith('//')
const callbackUrl = isSafeCallback ? rawCallback : '/'
```

Both the mini-app `signIn` path (`router.replace(callbackUrl)`) and the standalone widget path (`router.push(callbackUrl)`) now redirect to the intended destination after a successful sign-in instead of always going to `/`.

Added a contextual subtitle: when `callbackUrl === '/'` (i.e. the user was redirected from the My Assets tab) the login page shows `login.subtitlePortfolio` ("برای پیگیری سبد دارایی خود وارد شوید") instead of the generic `login.subtitle`.

#### `src/components/guest-login-banner.tsx` — new

Sticky banner rendered at the top of the app layout for unauthenticated standalone web users. Visibility rules:

- Returns `null` when `getRawInitData()` is truthy (Telegram mini app — auth is via initData, not session)
- Returns `null` on `/login` itself
- Returns `null` while `status === 'loading'` or when a session exists

The banner's CTA navigates to `/login?callbackUrl=<encodeURIComponent(pathname)>` using the actual current route, so a guest on `/prices` is sent back to `/prices` after login — not always to `/`.

Requires `SessionProvider` to be in the React tree (see `client-root.tsx` below).

#### `src/app/(app)/layout.tsx` — render `GuestLoginBanner`

Added `<GuestLoginBanner />` between `<DevLocaleSwitcher />` and `<main>`. The layout is already `'use client'` so no structural changes were needed.

#### `src/components/client-root.tsx` — `SessionProvider` added

`useSession()` (used by `GuestLoginBanner`) requires a `SessionProvider` ancestor. The existing provider order was `TRPCReactProvider → LocaleProvider → ClientProviders`. The plan's Task C.1.6 showed `SessionProvider → LocaleProvider → TRPCReactProvider`, which would break `LocaleProvider` (it calls `api.user.setPreferredLocale.useMutation()` and therefore requires `TRPCReactProvider` as an ancestor).

The correct order implemented:

```
SessionProvider        ← outermost, enables useSession()
  TRPCReactProvider    ← must wrap LocaleProvider
    LocaleProvider     ← calls api.user.setPreferredLocale
      ClientProviders  ← TelegramProvider (ssr: false)
```

`SessionProvider` is a lightweight context from `next-auth/react`. For guests it returns `{ data: null, status: 'unauthenticated' }` without errors; for authenticated users it fetches the session once and caches it.

---

### Milestone C.2 — Multiple Named Portfolios (P1)

#### `prisma/schema.prisma` — `Portfolio` model + FKs

**New model:**

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

**`UserAsset` changes:**
- Added `portfolioId String` FK with `onDelete: Cascade`
- Changed unique constraint from `@@unique([userId, symbol])` to `@@unique([userId, symbol, portfolioId])` — allows the same symbol in multiple portfolios
- Added `@@index([portfolioId])`

**`PortfolioSnapshot` changes:**
- Added nullable `portfolioId String?` FK — `null` means consolidated (all portfolios summed); a non-null value means a per-portfolio snapshot
- Added `@@index([portfolioId, snapshotAt(sort: Desc)])`

**`User` changes:**
- Added `portfolios Portfolio[]` relation

**Migration sequence:** The `portfolioId` FK on `UserAsset` is non-nullable but must be populated for the existing 2 rows before making it NOT NULL. Applied in two stages:

1. `prisma db push` with `portfolioId String?` (nullable) — adds the column and the Portfolio table without failing on existing rows
2. `pnpm tsx scripts/migrate-default-portfolios.ts` — creates one `Portfolio { name: "سبد من", emoji: "💼" }` per user who has assets, then assigns all their assets to it
3. `prisma db push --accept-data-loss` with `portfolioId String` (non-nullable) + `@@unique([userId, symbol, portfolioId])` — makes the column required and adds the new unique constraint

`prisma generate` was run after each push to keep the client in sync.

#### `scripts/migrate-default-portfolios.ts` — new

Idempotent data migration script. Uses `PrismaNeon` adapter directly (same adapter as `src/server/db.ts`) so it uses the pooler connection string from `DATABASE_URL`. For each user who has assets: creates a default portfolio if one does not already exist, then `updateMany`s all their assets to point to it. Safe to re-run — the `findFirst` check before creation prevents duplicate default portfolios.

#### `src/lib/portfolio.ts` — updated `createPortfolioSnapshot`

Signature changed from `(db, userId)` to `(db, userId, portfolioId: string | null)`.

- When `portfolioId` is a string: queries only `userAsset.findMany({ where: { userId, portfolioId } })` — per-portfolio snapshot
- When `portfolioId` is `null`: queries `{ where: { userId } }` — consolidated snapshot across all portfolios

The deduplication `findFirst` also filters by `portfolioId` so per-portfolio and consolidated snapshots each have their own independent 5-minute dedup window.

#### `src/server/api/helpers.ts` — new

Shared `requireOwnedPortfolio(db, id, userId)` helper that finds the portfolio by PK and throws `NOT_FOUND` if missing or not owned. Identical in structure to `requireOwnedAsset` in `assets.ts`. Extracted into a separate file because both `portfolio.ts` and `assets.ts` routers need it.

#### `src/server/api/routers/portfolio.ts` — CRUD + modified analytics + export

**New procedures:**

| Procedure | Notes |
|---|---|
| `list` | Returns all portfolios ordered by `createdAt asc` with `assetCount` from `_count: { select: { assets: true } }` |
| `create` | Checks `portfolio.count` < `MAX_PORTFOLIOS = 10` before creating; error message in Persian |
| `rename` | Ownership-checked via `requireOwnedPortfolio`; accepts `emoji: string \| null` to allow emoji clearing |
| `delete` | Ownership-checked; prevents deleting the last portfolio (`count <= 1` guard); fires `createPortfolioSnapshot(db, userId, null)` to rebuild the consolidated snapshot without the deleted portfolio's assets; `onDelete: Cascade` on the FK handles the assets and per-portfolio snapshots |
| `export` | Returns `{ csv: string, rowCount: number }` with format `date,totalIRT,totalUSD,breakdown_json`; `totalUSD` uses the current USD sell price (not historical); `breakdown_json` is double-quote-escaped for RFC 4180 compliance |

**Modified procedures (`history`, `delta`, `breakdown`):** All three gained an optional `portfolioId` input via a shared `portfolioIdInput = z.string().min(1).optional()` constant. When `portfolioId` is set, an ownership check runs via `requireOwnedPortfolio` before querying. The filter applied:

```typescript
const portfolioFilter = input?.portfolioId
  ? { portfolioId: input.portfolioId }
  : { portfolioId: null }  // null = consolidated
```

This ensures that omitting `portfolioId` always reads consolidated snapshots and never accidentally reads all snapshots regardless of portfolio.

#### `src/server/api/routers/assets.ts` — `list`, `add`, `update`, `delete`

- **`list`**: added optional `portfolioId` input; `whereClause` is `{ userId, portfolioId }` when set, `{ userId }` when absent (returns all assets across all portfolios for the consolidated view)
- **`add`**: now requires `portfolioId`; ownership-checked before upsert; upsert key updated to the new compound name `userId_symbol_portfolioId`; fires two snapshots after upsert — one for the specific portfolio, one consolidated
- **`update`** / **`delete`**: call `requireOwnedAsset` which returns the full asset record including `portfolioId`; fire both `createPortfolioSnapshot(db, userId, asset.portfolioId)` and `createPortfolioSnapshot(db, userId, null)` — was previously a single consolidated-only call

#### `src/app/api/cron/portfolio/route.ts` — per-portfolio snapshots

Changed the snapshot loop from a single consolidated call per user to:

```typescript
for (const portfolio of portfolios) {
  const snap = await createPortfolioSnapshot(db, user.id, portfolio.id)
  if (snap) portfolioSnapshotCount++
}
const snap = await createPortfolioSnapshot(db, user.id, null)
if (snap) portfolioSnapshotCount++
```

`portfolioSnapshotCount` now counts both per-portfolio and consolidated snapshots. Portfolio alert evaluation and daily digest queries were updated to filter by `portfolioId: null` (consolidated) so they remain unaffected by per-portfolio snapshots.

#### `src/components/portfolio-selector.tsx` — new

A native `<select>` element styled to match the HeroUI card aesthetic. Options:
- `value=""` → "📊 همه سبدها" (consolidated)
- One `<option>` per portfolio with `{emoji ?? '💼'} {name} ({assetCount})`
- `value="__create__"` → "➕ سبد جدید" — selecting this calls `onCreate()` instead of switching the view

The `▾` caret is an absolutely-positioned `<span>` that can't be clicked (pointer-events: none), working around the fact that `appearance-none` removes the native caret.

#### `src/components/portfolio-form-modal.tsx` — new

Shared modal for both create and rename modes. Uses `useEffect` to populate the name/emoji fields from the `portfolio` prop whenever `isOpen` toggles to `true`. Calls `portfolio.create` or `portfolio.rename` based on `mode`. Invalidates `portfolio.list` on success.

#### `src/components/portfolio-delete-modal.tsx` — new

Confirmation modal showing the portfolio name and the asset count that will be deleted. Uses `variant="danger"` for the delete button (not `"destructive"` — caught during typecheck). Invalidates `portfolio.list`, `assets.list`, `portfolio.history`, `portfolio.breakdown`, and `portfolio.delta` on success so all dependent queries refresh.

#### `src/components/ui/section.tsx` — `trailing` prop

Added an optional `trailing?: ReactNode` prop. When either `header` or `trailing` is non-null, a `flex items-center justify-between` row wraps the header `<h2>` and the trailing slot. Sections with neither `header` nor `trailing` render no row at all — unchanged from before.

#### `src/components/portfolio-delta.tsx` — `portfolioId` prop

Added optional `portfolioId?: string` prop. The internal `api.portfolio.delta.useQuery` call uses `{ window, portfolioId }` when `portfolioId` is set; otherwise passes `{ window }` for consolidated. Since the query input changes when `portfolioId` changes, React Query automatically re-fetches with the new key.

#### `src/app/(app)/page.tsx` — portfolio state + integration

New state and queries:
- `selectedPortfolioId: string | null` — `null` = consolidated view
- `showCreateModal`, `showRenameModal`, `showDeleteModal` booleans
- `portfolioToDelete: { id, name, assetCount } | null`
- `api.portfolio.list.useQuery()` — fetches all portfolios for the selector

All data queries (`assets.list`, `portfolio.history`, `portfolio.breakdown`) now pass `{ portfolioId: selectedPortfolioId }` when a specific portfolio is selected.

The `PortfolioSelector` is shown only when `portfoliosQuery.data.length > 1` — users with a single portfolio (the default state) see the same UI as before Phase C.

When a specific portfolio is selected, two small icon buttons appear below the selector: a pencil (`IconPencil`) that opens `PortfolioFormModal` in rename mode, and a trash (`IconTrash`) that opens `PortfolioDeleteModal`.

The FAB "Add Asset" button passes the currently selected portfolio:

```typescript
onPress={() => {
  const pid = selectedPortfolioId ?? defaultPortfolioId
  if (pid) router.push(`/assets/add?portfolioId=${pid}`)
  else router.push('/assets/add')
}}
```

A `useEffect` resets `selectedPortfolioId` to `null` when the selected portfolio is removed from `portfoliosQuery.data` — prevents the view from being stuck on a deleted portfolio.

#### `src/app/(app)/assets/add/page.tsx` — `portfolioId` from URL

Added `useSearchParams()` to read `?portfolioId=`. When no `portfolioId` is present in the URL (e.g. navigating directly), a secondary `api.portfolio.list.useQuery({ enabled: !portfolioId })` fetches the default portfolio. The `isLoading` guard waits for both the price query and the portfolio query before rendering `AssetPicker`.

#### `src/components/asset-picker.tsx` — `portfolioId` prop

Added required `portfolioId: string` prop. The `addMutation.mutate` call now passes `{ symbol, quantity, portfolioId }`. The `AssetPicker` interface was a breaking change — all callers were updated.

---

### Milestone C.3 — CSV Export (P1)

#### `src/server/api/routers/portfolio.ts` — `export` procedure

`protectedProcedure` with optional `portfolioId` input (ownership-checked when set). Fetches all `PortfolioSnapshot` rows for the user/portfolio ordered by `snapshotAt asc`, and the latest `PriceSnapshot` for current USD conversion. Builds a CSV string:

```
date,totalIRT,totalUSD,breakdown_json
2026-01-15,1250000000,"7399.76","[{""symbol"":""USD"",..."
```

`breakdown_json` is JSON-stringified and double-quote-escaped via `.replace(/"/g, '""')` for correct RFC 4180 embedding inside a quoted field. Returns `{ csv, rowCount }` — `rowCount = 0` when no snapshots exist, allowing the client to show an appropriate empty-state message without parsing the CSV.

#### `src/lib/csv-download.ts` — new

```typescript
import WebApp from '@twa-dev/sdk'

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  if (isTelegramWebApp()) {
    try { WebApp.openLink(url) }
    catch { triggerDownload(url, filename) }
  } else {
    triggerDownload(url, filename)
  }
}
```

The `\uFEFF` UTF-8 BOM prefix ensures Excel correctly interprets Persian text in `breakdown_json`. Uses `WebApp.openLink()` from `@twa-dev/sdk` (the same package used everywhere else) — no `window.Telegram` access.

#### `src/app/(app)/page.tsx` — export button

`api.portfolio.export.useQuery` with `{ enabled: false }` — only fetches on demand. `handleExport` calls `exportQuery.refetch()` and either downloads the file or shows a `toast.info(tExport('empty'))` when `rowCount === 0`. The export button is a ghost icon-only `Button` with `IconDownload` rendered in the `trailing` slot of the My Assets hero `Section`.

---

### i18n — new namespaces

Both `messages/fa.json` and `messages/en.json` received four additions:

| Namespace / Key | fa | en |
|---|---|---|
| `login.subtitlePortfolio` | برای پیگیری سبد دارایی خود وارد شوید | Log in to track your portfolio |
| `guest.ctaBanner` | 📊 سبد دارایی خود را دنبال کنید — ورود با تلگرام | 📊 Track your portfolio — Log in with Telegram |
| `guest.loginPrompt` | برای دیدن دارایی‌ها وارد شوید | Log in to see your assets |
| `portfolios.*` | 21 keys — CRUD labels, toasts, confirmations | same |
| `export.*` | 4 keys — button, success, empty, error | same |

---

## Commit 2 — `cd0adc6` `fix: quality review fixes post phase C implementation`

Three parallel code-review subagents (simplicity/DRY, correctness/bugs, project conventions) ran against the full diff and identified 15 issues. All HIGH and MEDIUM items were addressed.

---

### Bugs / security fixed

| Severity | Issue | Fix |
|---|---|---|
| HIGH | `callbackUrl` was passed unvalidated to `router.replace` / `router.push` — a crafted `/login?callbackUrl=https://evil.com` would redirect users off-site after authentication | Added `isSafeCallback = rawCallback.startsWith('/') && !rawCallback.startsWith('//')` guard; falls back to `'/'` when the check fails |
| HIGH | `portfolio.history`, `delta`, `breakdown`, `export` accepted a `portfolioId` input but did not verify the caller owned that portfolio — wrong ID returned empty data silently | Added `requireOwnedPortfolio` ownership check at the top of each query when `portfolioId` is provided |
| MEDIUM | `GuestLoginBanner` always routed to `/login?callbackUrl=/` regardless of current page — users on `/calculator` would land on My Assets after login | Changed to encode the current `pathname` from `usePathname()` |
| MEDIUM | `portfolio.create` and `portfolio.delete` error messages were in English (`"Maximum 10 portfolios allowed"`) while the rest of the app uses Persian for user-facing server errors | Changed both messages to Persian (`"حداکثر ۱۰ سبد مجاز است"`, `"حداقل یک سبد باید وجود داشته باشد"`) |
| MEDIUM | `PortfolioDeleteModal` used `variant="destructive"` — this variant does not exist in the HeroUI version used; the Button rendered with no styling and no TypeScript error at the time (caught by typecheck after the fact) | Changed to `variant="danger"` |
| MEDIUM | Cron `portfolioSnapshotCount` only incremented when the consolidated snapshot was created, silently undercounting per-portfolio snapshots in the response log | Per-portfolio snapshot results now also checked and counted |

---

### Refactors applied

| Issue | Fix |
|---|---|
| `requireOwnedPortfolio` helper was defined identically in both `portfolio.ts` and `assets.ts` | Extracted to `src/server/api/helpers.ts`; both routers import from there |
| `PortfolioFormModal`, `PortfolioDeleteModal` — delete/rename flows were fully implemented in components but never triggered from `page.tsx` | Added rename (pencil icon) and delete (trash icon) action buttons below the `PortfolioSelector` when a specific portfolio is selected |
| `deltaQuery` was fetched in `page.tsx` and included in pull-to-refresh, but `PortfolioDelta` makes its own internal query and is already re-keyed on `portfolioId` change | Removed the redundant `deltaQuery` from the page; `PortfolioDelta` handles its own data lifecycle |

---

## Commit 3 — `6ab6a11` `fix: use @twa-dev/sdk WebApp.openLink instead of window.Telegram cast in csv-download`

`csv-download.ts` originally used a `(window as Window & { Telegram?: ... }).Telegram?.WebApp?.openLink?.()` type cast — the only place in the codebase that accessed the Telegram global through `window` directly rather than through the SDK. Replaced with `WebApp.openLink(url)` from `@twa-dev/sdk`, consistent with every other SDK call in the project.

---

## Final file inventory

### New files (7)

| File | Purpose |
|---|---|
| `src/components/guest-login-banner.tsx` | Sticky login CTA banner for unauthenticated standalone web guests |
| `src/components/portfolio-selector.tsx` | `<select>` dropdown for switching active portfolio |
| `src/components/portfolio-form-modal.tsx` | Create / rename portfolio modal |
| `src/components/portfolio-delete-modal.tsx` | Delete portfolio confirmation modal |
| `src/lib/csv-download.ts` | Client-side CSV download utility with UTF-8 BOM |
| `src/server/api/helpers.ts` | Shared `requireOwnedPortfolio` ownership guard |
| `scripts/migrate-default-portfolios.ts` | Idempotent data migration — creates default portfolio per user |

### Modified files (16)

| File | Change |
|---|---|
| `src/proxy.ts` | Whitelist `/prices` and `/calculator`; add `callbackUrl` to redirect |
| `src/app/login/page.tsx` | Read + validate `callbackUrl`; contextual subtitle |
| `src/app/(app)/layout.tsx` | Render `GuestLoginBanner` |
| `src/components/client-root.tsx` | Add `SessionProvider` as outermost provider |
| `prisma/schema.prisma` | `Portfolio` model; `portfolioId` FKs; updated unique constraint |
| `src/lib/portfolio.ts` | `createPortfolioSnapshot(db, userId, portfolioId \| null)` |
| `src/server/api/routers/portfolio.ts` | `list/create/rename/delete/export`; `history/delta/breakdown` with `portfolioId` + ownership checks |
| `src/server/api/routers/assets.ts` | `list` filter; `add` requires `portfolioId`; `update`/`delete` dual snapshots |
| `src/app/api/cron/portfolio/route.ts` | Per-portfolio + consolidated snapshots; consolidated-only for alerts/digests |
| `src/components/ui/section.tsx` | `trailing?: ReactNode` slot in section header |
| `src/components/portfolio-delta.tsx` | `portfolioId?: string` prop |
| `src/app/(app)/page.tsx` | Portfolio state, selector, rename/delete buttons, export button |
| `src/app/(app)/assets/add/page.tsx` | Read `portfolioId` from URL search params |
| `src/components/asset-picker.tsx` | Required `portfolioId: string` prop |
| `messages/fa.json` | `guest`, `portfolios`, `export` namespaces; `login.subtitlePortfolio` |
| `messages/en.json` | Same |

---

## Architecture decisions

| Decision | Rationale |
|---|---|
| Proxy whitelist (Option 1 from AD-1) for guest pages | Minimal change (2 lines); preserves security-by-default for all other routes; no route group refactor needed |
| `null` portfolioId on `PortfolioSnapshot` means consolidated | Avoids a separate `ConsolidatedSnapshot` model; null = "all portfolios summed" is self-documenting; queries that use portfolio-specific snapshots always pass an explicit non-null ID |
| Two-stage DB migration rather than a single migration with embedded SQL | Prisma shadow database rejected the initial migration (`20250319120000_add_preferred_locale` could not be applied cleanly to an empty shadow DB, since the initial table creation was never tracked as a migration). `db push` with an intermediate data-migration script was the pragmatic path given the project's existing migration state |
| `portfolioId` required on `assets.add` (not defaulting to first portfolio) | Forces callers to be explicit; prevents silent "wrong portfolio" bugs if the client's portfolio list is stale |
| CSV returned as a string from tRPC, not a streamed API route | Consistent with existing architecture (no new API routes); data volume is small (365 rows × ~4 columns ≈ 30 KB max); no auth duplication |
| `WebApp.openLink()` for Telegram CSV download, not `WebApp.downloadFile()` | `WebApp.downloadFile()` is a newer Bot API method not yet in `@twa-dev/sdk` 8.x; `openLink` with a blob URL works on all supported platforms and already has a fallback |

---

## Decisions deviating from the plan

| Plan | Actual | Reason |
|---|---|---|
| `SessionProvider` as outermost, wrapping `LocaleProvider` then `TRPCReactProvider` | `SessionProvider → TRPCReactProvider → LocaleProvider` | `LocaleProvider` calls `api.user.setPreferredLocale.useMutation()` and requires `TRPCReactProvider` as an ancestor; the plan's provider order would have broken locale persistence |
| Single `prisma migrate dev` migration with embedded SQL data migration | Two-stage `prisma db push` + standalone script | Shadow database rejected the existing migration history; `db push` is the correct tool for this project's current migration state |
| `portfolio.breakdown` accepts `portfolioId` input | Implemented, with ownership check added during review | Plan listed it as needing the input but did not mention the ownership check — added proactively during review |

---

## Known limitations / future work

| Item | Notes |
|---|---|
| Portfolio selector is a native `<select>` | The plan originally specified a HeroUI `Select` but no HeroUI `Select` or `Dropdown` component exists in the project's existing component inventory. A native `<select>` with custom styling was used; migrating to a HeroUI component when one is added is a future improvement |
| CSV `totalUSD` uses current price, not historical | Computing historical USD rates would require cross-referencing `PriceSnapshot` by date for each row. Noted in the `export` procedure docstring; acceptable for v2 per the plan |
| Portfolio selector rename/delete exposed only when `>1 portfolio` | With exactly one portfolio, no selector is shown, so the edit/delete buttons are also absent. Creating a second portfolio via the "New Portfolio" option in the selector makes both appear. Managing the single default portfolio (rename/emoji) requires creating a second portfolio first — a UX gap to address in a future release |
| `callbackUrl` in proxy carries path only, not query string | A user redirected mid-session from `/assets/add?portfolioId=xyz` will land on `/assets/add` after login (without the `portfolioId` param). The Add Asset page gracefully falls back to the first portfolio in this case, so data is not lost |
| `prisma migrate dev` not yet established | `db push` was used throughout v2. A proper migration history (`prisma migrate dev`) should be set up before the next schema change in production to enable rollbacks and auditable migration history |

---

## Verification

```bash
pnpm test        # 98 tests, 10 files — all passing
pnpm lint        # Biome: 0 errors, 1 nursery warning (CSS class sort, unfixable automatically)
pnpm typecheck   # 0 errors

# DB migration
pnpm prisma db push           # stage 1: Portfolio table + nullable portfolioId
pnpm tsx scripts/migrate-default-portfolios.ts  # data migration: 1 user, 2 assets migrated
pnpm prisma db push --accept-data-loss  # stage 2: NOT NULL + new unique constraint
```

Manual (`pnpm dev`): `/prices` loads without auth with the sticky guest banner visible; `/calculator` likewise; My Assets page shows a download icon in the section header; clicking it with no snapshots shows "No data to export" toast; Add Asset page navigates to `/assets/add?portfolioId=<id>` and renders the asset picker.
