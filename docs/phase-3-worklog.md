# Phase 3 Worklog — Polish & Launch

> **Branch:** `cursor/phase-3-documentation-plan-363a`  
> **Base:** `master` @ `89200a4`  
> **Completed:** Mon 16 Mar 2026  
> **Commits:** `b9816e2`, `aef04c8`

---

## What Was Built

All four code milestones from `docs/phase-3-plan.md` were implemented (M3.5 Production Deployment is a manual ops step requiring external credentials and is not automated here).

---

## Milestone 3.1 — Telegram SDK Polish

### New hooks

**`src/hooks/use-telegram-main-button.ts`**

Manages the Telegram MainButton lifecycle — `setText`, `show`/`hide`, `onClick`/`offClick`, `showProgress`/`hideProgress`. Uses the same stable-ref pattern as the existing `useTelegramBackButton` so the effect only re-fires when `isVisible` or `text` changes, not on every render. The second effect that drives `showProgress` returns a cleanup calling `hideProgress()` to prevent progress state leaking into the next page's MainButton session.

**`src/hooks/use-telegram-haptics.ts`**

Thin stable `useCallback` wrappers around `WebApp.HapticFeedback`. Returns three functions: `impactOccurred`, `notificationOccurred`, `selectionChanged`. All are no-ops when the SDK property is absent (standalone web, unit tests).

**`src/hooks/use-viewport-height.ts`**

Subscribes to `WebApp.onEvent('viewportChanged')` and writes `WebApp.viewportStableHeight` into the `--tg-viewport-height` CSS custom property. Cleans up both the event listener and the property on unmount. A `100svh` fallback was added to `src/styles/globals.css` so the variable is always defined.

### Updated files

| File | Change |
|---|---|
| `src/components/telegram-provider.tsx` | Added `useState(WebApp.colorScheme)` + `themeChanged` event listener so `AppRoot.appearance` updates live when the user switches Telegram's theme. Calls `useViewportHeight()` globally. |
| `src/components/bottom-nav.tsx` | Calls `selectionChanged()` haptic on tab switch. |
| `src/components/asset-list-item.tsx` | Calls `notificationOccurred('success'/'error')` on update mutation outcome; `impactOccurred('medium')` on delete success. |
| `src/components/asset-picker.tsx` | Calls `notificationOccurred` on add mutation outcome. Wires `useTelegramMainButton` as the primary save trigger. Hides the inline `<Button>` when `isTelegramWebApp()` returns true. |
| `src/utils/telegram.ts` | Added `isTelegramWebApp()` — returns `true` when `WebApp.MainButton` is present. |

---

## Milestone 3.2 — Portfolio Time-Series Charts

### Backend

**`src/lib/portfolio.ts`** — `createPortfolioSnapshot(db, userId)`:

1. Fetches `UserAsset[]` + latest `PriceSnapshot` in parallel.
2. Returns `null` when the user has no assets or no price snapshot exists.
3. Skips creation if a snapshot for the same user already exists within the last 5 minutes (deduplication window prevents rapid edit/delete cycles from flooding the table).
4. Computes `totalIRT` by summing `quantity × sellPrice` for each asset.
5. Builds `breakdown: [{ symbol, quantity, valueIRT }]` for future per-asset chart extraction.
6. Calls `db.portfolioSnapshot.create(...)`.

**`src/server/api/routers/assets.ts`** — After each successful `add`, `update`, or `delete` mutation, calls `void createPortfolioSnapshot(ctx.db, ctx.user.id)` (fire-and-forget, never blocks the mutation response).

**`src/app/api/cron/prices/route.ts`** — After saving the new `PriceSnapshot`, iterates all users with at least one asset and calls `createPortfolioSnapshot` for each. Also prunes `PortfolioSnapshot` rows older than 365 days. Response now includes `portfolioSnapshotCount`.

**`src/server/api/routers/portfolio.ts`** — New tRPC router with a single `history` procedure (`protectedProcedure`). Accepts an optional `{ days: 1–365 }` input (defaults to 30). Returns `Array<{ date: Date; totalIRT: number }>` sorted ascending. Registered as `portfolio` in `src/server/api/root.ts`.

### Frontend

**`src/components/portfolio-chart.tsx`** — Recharts `LineChart` inside a `ResponsiveContainer`. Design decisions:

- Uses `getComputedStyle(document.documentElement)` after mount to read `--tgui--accent_text_color` and `--tgui--divider` so the line and grid colors match Telegram's live theme (works for both light and dark mode, and theme switches).
- `dir="ltr"` wrapper so number axes don't flip in RTL.
- Custom `ChartTooltip` built with TGUI CSS variable inline styles so the popup matches the card/text colors.
- Shows a `Placeholder` empty state when `data.length < 2` (not enough points to draw a meaningful line).
- Date labels formatted with `Intl.DateTimeFormat('fa-IR')` when locale is `fa`, `en-US` otherwise.

**`src/app/[locale]/(app)/page.tsx`** — Added `api.portfolio.history.useQuery({ days: 30 })`. Renders `<PortfolioChart>` inside a `Section` between the portfolio total and the asset list, only when query data exists.

---

## Milestone 3.3 — Price List UX

**`src/hooks/use-pull-to-refresh.ts`** — Custom pull-to-refresh (TGUI v2.1.13 does not export a `PullToRefresh` component). Uses touch event listeners on `document`. Key details:

- `onRefresh` callback is stored in a ref so the `useEffect` that registers listeners has a stable dep (`handleRefresh`) and never tears down/re-registers on parent re-renders.
- An `isRefreshingRef` guards against concurrent refresh calls (avoids the state-closure race).
- Threshold: 72 px downward pull from `scrollY === 0`.

**`src/app/[locale]/(app)/prices/page.tsx`** — Added:
- `useState('')` search state fed into `filterPriceItems()` (already implemented in `src/lib/prices.ts`).
- TGUI `<Input type="search">` at top of list.
- `isError` guard with retry button (was previously silently falling through to the empty placeholder on network errors).
- `usePullToRefresh` integration.
- `<StalenessBanner>` when `data.stale` is true.

**`src/app/[locale]/(app)/page.tsx`** — Added `usePullToRefresh` that refetches both the assets query and the portfolio history query together.

---

## Milestone 3.4 — Error, Empty & Loading States

### Skeleton components

Three new files under `src/components/skeletons/`:

| Component | Mirrors |
|---|---|
| `AssetsSkeleton` | Total value block + 4 asset cell rows |
| `PricesSkeleton` | 3 section headers + 5 rows each |
| `CalculatorSkeleton` | 4 input rows + result block |

All use TGUI's `<Skeleton visible>` with `div` children sized to match the real layout. Each page now returns its skeleton instead of the centered `<Spinner size="l" />` when `isLoading` is true.

### Staleness banner

**`src/components/staleness-banner.tsx`** — Shared component used by both the assets and prices pages:

- `namespace="prices"`: shows "آخرین به‌روزرسانی: {time}" with a relative time string computed from `snapshotAt` (e.g. "۲ ساعت پیش"). Falls back to `tPrices('checkLater')` when `snapshotAt` is null.
- `namespace="assets"`: shows the static "قیمت‌ها ممکن است به‌روز نباشد" note (no timestamp).

### Error boundary enhancements

**`src/app/[locale]/(app)/error.tsx`** — Two new error classifiers added before the generic fallback:

- `isUnauthorized(error)` — checks `error.message` and `error.data?.code` for `UNAUTHORIZED`; shows a session-expired message with a "ورود مجدد" button that navigates to `/login`.
- `isConnectionError(error)` — checks for Prisma error patterns (`P1001`, `P2024`, `ECONNREFUSED`, etc.); shows a server-connection message.

All new string keys were moved to the `common` namespace because the error boundary catches errors from all pages, not just the assets page.

---

## i18n Changes

New keys added to both `messages/fa.json` and `messages/en.json`:

| Namespace | Keys added |
|---|---|
| `assets` | `portfolioChart`, `chartEmpty`, `chartPeriod7/30/90/365`, `staleWarning`, `lastUpdated`, `sessionExpired`, `sessionExpiredDescription`, `reLogin`, `connectionError`, `retryLater`, `mainButtonSave`, `mainButtonConvert` |
| `prices` | `search`, `noResults`, `staleWarning` |
| `common` | `sessionExpired`, `sessionExpiredDescription`, `reLogin`, `connectionError`, `connectionErrorDescription` |

---

## Dependency Added

| Package | Version | Purpose |
|---|---|---|
| `recharts` | `3.8.0` | Portfolio line chart |

Added to `optimizePackageImports` in `next.config.ts`.

---

## Decisions Deviating from the Plan

| Plan | Actual | Reason |
|---|---|---|
| Use `TelegramUI.PullToRefresh` | Custom `usePullToRefresh` hook | TGUI v2.1.13 does not export `PullToRefresh` |
| `useTelegramMainButton` called from `assets/add/page.tsx` | Called from `AssetPicker` component | `AssetPicker` owns the `selected` + `quantity` state; the hook must be called where those values live |
| MainButton on Calculator as "تبدیل" | Not wired | Conversion is already live (reactive); the button would be a no-op action — haptic `selectionChanged` on swap was wired instead |

---

## Issues Found and Fixed During Review

| Issue | Fix |
|---|---|
| `use-pull-to-refresh`: `onRefresh` ref lost stability, listeners re-registered every render | Moved `onRefresh` + in-flight guard to refs; `useEffect` dep array is now just stable `handleRefresh` |
| `use-telegram-main-button`: `hideProgress()` never called on unmount | Added `return () => WebApp.MainButton?.hideProgress()` to the second effect |
| `asset-picker`: duplicate MainButton taps allowed during pending mutation | Added `if (addMutation.isPending) return` guard at top of `handleSave` |
| `prices/page`: network errors silently showed empty state | Added `isError` branch with retry button |
| `staleness-banner`: wrong translation namespace when `prices` snapshotAt is null | Falls back to `tPrices('checkLater')` instead of the `assets` namespace key |
| `use-viewport-height`: CSS variable leaked after unmount | Added `style.removeProperty('--tg-viewport-height')` to cleanup |
| `portfolio-chart`: `formatChartDate` duplicated `Intl.DateTimeFormat` construction | Collapsed to single call with conditional locale string |
| `error.tsx`: used `assets` namespace keys for app-wide boundary | Moved `sessionExpired`/`connectionError` keys to `common` namespace |
| ESLint disable comment in `use-telegram-main-button` | Replaced with `biome-ignore lint/correctness/useExhaustiveDependencies` |

---

## What Remains (Not Automated)

**M3.5 — Production Deployment** (manual steps, documented in `docs/phase-3-plan.md` §8):

- [ ] Create Vercel project and set environment variables
- [ ] Run `prisma migrate deploy` against the production Neon DB
- [ ] Register mini app URL with BotFather (`/setmenubutton`, `/newapp`)
- [ ] Verify cron job in Vercel Dashboard and trigger a manual test run
- [ ] Run smoke test checklist from §8.5

**Deferred features** (from plan §3.2.8):

- Per-asset value chart — the `breakdown` JSON is populated correctly in every snapshot; the UI and extraction logic are left for a future phase.
- Chart period selector (`SegmentedControl` for 7d/30d/90d/1y) — the `portfolio.history` endpoint already accepts a `days` param; the UI switcher is a stretch goal.
