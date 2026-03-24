# Phase 3: Polish & Launch — Implementation Plan

> **Cheghadr? (چه قدر؟)** — Personal Net Worth Tracker  
> Phase 3 makes the app feel like Telegram, not a website inside Telegram, then ships it to production.  
> Source: [PRD](https://www.notion.so/324ba087d94a8114b46aeb2a4d8a7af1) · [Roadmap](https://www.notion.so/324ba087d94a81b5ad78ddbd08b067c4)  
> Estimated effort: ~9 days · Target: Week 5

---

## Table of Contents

1. [Phase 2 Recap & Starting State](#1-phase-2-recap--starting-state)
2. [Phase 3 Scope](#2-phase-3-scope)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Milestone 3.1 — Telegram SDK Polish](#4-milestone-31--telegram-sdk-polish)
5. [Milestone 3.2 — Portfolio Time-Series Charts](#5-milestone-32--portfolio-time-series-charts)
6. [Milestone 3.3 — Price List UX](#6-milestone-33--price-list-ux)
7. [Milestone 3.4 — Error, Empty & Loading States](#7-milestone-34--error-empty--loading-states)
8. [Milestone 3.5 — Production Deployment](#8-milestone-35--production-deployment)
9. [Dependency Graph & Task Order](#9-dependency-graph--task-order)
10. [New i18n Keys](#10-new-i18n-keys)
11. [Testing Strategy](#11-testing-strategy)
12. [Definition of Done](#12-definition-of-done)

---

## 1. Phase 2 Recap & Starting State

Phase 2 delivered all three core screens. Here's what exists and is ready for Phase 3:

| Component | Status | Key Files |
|---|---|---|
| **My Assets page** | ✅ Full CRUD with ownership guards, live valuation, empty state | `src/app/[locale]/(app)/page.tsx`, `src/server/api/routers/assets.ts` |
| **Price List page** | ✅ Grouped by category, sell price, change %, staleness badge | `src/app/[locale]/(app)/prices/page.tsx`, `src/components/price-section.tsx` |
| **Calculator page** | ✅ From/to selectors, amount input, swap, real-time conversion | `src/app/[locale]/(app)/calculator/page.tsx` |
| **Bottom tab nav** | ✅ TelegramUI `Tabbar` with 3 tabs | `src/components/bottom-nav.tsx` |
| **BackButton** | ✅ Hook for sub-pages | `src/hooks/use-telegram-back-button.ts` |
| **Error boundary** | ✅ Route-level error.tsx with retry | `src/app/[locale]/(app)/error.tsx` |
| **Loading** | ⚠️ Full-screen `Spinner` only — no skeletons | `src/app/[locale]/(app)/loading.tsx` |
| **PortfolioSnapshot** | ✅ Prisma model exists, no writes or reads yet | `prisma/schema.prisma` |
| **Price search util** | ✅ `filterPriceItems()` implemented | `src/lib/prices.ts` |
| **TelegramUI** | ✅ `AppRoot` wrapping app, `requestFullscreen()` on iOS/Android | `src/components/telegram-provider.tsx` |
| **Auth** | ✅ Dual-path: initData + NextAuth + dev bypass | `src/server/api/trpc.ts`, `src/proxy.ts` |
| **Cron** | ✅ `/api/cron/prices` route; production schedule via **cron-job.org** (see `docs/cron-scheduling.md`) | `src/app/api/cron/prices/route.ts` |
| **Tests** | ✅ 33 unit tests passing (Vitest) | `src/**/*.test.ts` |

### What Phase 3 Builds On

- **No MainButton or HapticFeedback usage** — standard `Button` components are used for all CTAs (Save, Delete, Add Asset). Phase 3 wires the Telegram SDK equivalents.
- **No `viewportStableHeight` handling** — layout uses `min-h-svh` and CSS variables. The Add Asset form's quantity input may get hidden behind the mobile keyboard.
- **No theme sync** — `AppRoot` reads `WebApp.colorScheme` once at mount, but doesn't listen for `themeParams` changes (user switches theme while app is open).
- **No portfolio history** — `PortfolioSnapshot` model exists with `totalIRT` (Decimal) and `breakdown` (Json) fields, but no data is ever written or read. No `portfolio` tRPC router exists.
- **No search on Price List** — `filterPriceItems()` util is ready in `src/lib/prices.ts` but no UI input renders it.
- **No pull-to-refresh** — auto-refresh covers MVP via `refetchInterval: 30 * 60 * 1000`.
- **Loading = Spinner** — all pages show a centered `<Spinner size="l" />` during load. No skeleton screens.
- **Error states are minimal** — route-level `error.tsx` catches React errors; per-page error handling is basic (Placeholder + retry on assets page; silent fallback on prices).

---

## 2. Phase 3 Scope

Phase 3 delivers five milestones from the roadmap:

| Milestone | Deliverable | Priority | Effort |
|---|---|---|---|
| **3.1** Telegram SDK Polish | MainButton, HapticFeedback, viewportStableHeight, themeParams sync | Should | ~1.25d |
| **3.2** Portfolio Time-Series Charts | Daily cron, snapshot on mutation, tRPC history endpoint, line chart | Should | ~3d |
| **3.3** Price List UX | Search/filter UI, pull-to-refresh | Should | ~1d |
| **3.4** Error, Empty & Loading States | Skeletons, API-down fallback, initData failure, DB failure | Must | ~1.5d |
| **3.5** Production Deployment | Vercel deploy, BotFather registration, production DB, cron verification | Must | ~2d |

**Total: ~8.75 days + buffer**

By end of Phase 3, the app is **production-ready**: deployed to Vercel, registered as a Telegram mini app, with polished loading/error states and portfolio charts for retention.

---

## 3. Architecture Decisions

### Decision 1: Charting Library

**Options considered:**

| Library | Bundle Size | Telegram Feel | RTL Support | Maintained |
|---|---|---|---|---|
| **Recharts** | ~45 KB gzip | ⚠️ Desktop-centric defaults | ✅ Yes (manual flip) | ✅ Active |
| **Lightweight-charts** (TradingView) | ~45 KB gzip | ✅ Financial/mobile-native | ⚠️ Partial RTL | ✅ Active |
| **Chart.js + react-chartjs-2** | ~60 KB gzip | ⚠️ Generic | ✅ Yes | ✅ Active |
| **Custom SVG** | 0 KB extra | ✅ Full control | ✅ Full control | ⚠️ Maintenance cost |
| **@telegram-apps/telegram-ui** | Already bundled | ✅ Native | ✅ Yes | ✅ Active |

**Chosen: Recharts** — Best React integration, good RTL support, well-documented, responsive container built-in. The 45 KB cost is acceptable for a retention-driving P1 feature. The chart will use TGUI CSS variables for colors (accent, hint, bg) so it matches Telegram's theme automatically.

**Rationale against alternatives:**
- Lightweight-charts is powerful but designed for financial trading charts — overkill for a simple portfolio line chart and has a more complex API.
- Chart.js requires an extra React wrapper and has a larger bundle.
- Custom SVG avoids the dependency but requires significant effort for axes, labels, tooltips, responsive behavior, and RTL handling.

### Decision 2: Portfolio Snapshot Strategy

**Options considered:**

| Strategy | Pros | Cons |
|---|---|---|
| **A) Cron snapshots only** (daily batch for all users) | Simple, predictable DB load | Snapshot may be hours stale after asset change |
| **B) On-mutation snapshots only** | Always up-to-date | Misses days with no mutations; chart has gaps |
| **C) Both: cron + on-mutation** | Always fresh + no gaps | Slightly more writes; worth the tradeoff |

**Chosen: C — Both cron and on-mutation.** The daily cron ensures every active user gets at least one snapshot per day (even without asset changes, price movements affect portfolio value). On-mutation snapshots ensure the chart updates immediately when the user adds/edits/deletes an asset.

**Implementation details:**
- The daily cron runs as part of the existing `/api/cron/prices` route — after saving a new PriceSnapshot, iterate all users with ≥ 1 asset and create a PortfolioSnapshot for each.
- On mutation (add/edit/delete asset), compute the new total and save a PortfolioSnapshot in the same tRPC procedure.
- Deduplicate: if a snapshot already exists within the last 5 minutes for that user, skip (prevents rapid edit/delete cycles from creating excessive records).

### Decision 3: MainButton Integration Pattern

**Options considered:**

| Approach | Pros | Cons |
|---|---|---|
| **A) Global hook** — single `useTelegramMainButton(config)` hook per page | Clean, DRY, predictable | Needs careful cleanup between page navigations |
| **B) Component wrapper** — `<TelegramMainButton text="Save" onClick={fn} />` | Declarative, familiar React pattern | Still needs imperative cleanup |
| **C) Context provider** — parent provides MainButton API, children configure it | Full control, composable | Over-engineered for 2 use cases |

**Chosen: A — Global hook** `useTelegramMainButton({ text, onClick, isLoading, isVisible })`. Follows the same pattern as the existing `useTelegramBackButton` hook. The hook manages show/hide/setText/onClick/offClick lifecycle and cleans up on unmount.

**Usage locations:**
- Add Asset page: MainButton shows "ذخیره" (Save) when an asset is selected and quantity is entered.
- Calculator page: MainButton shows "تبدیل" (Convert) when both assets and amount are set.

### Decision 4: Skeleton Loading Pattern

**Options considered:**

| Approach | Pros | Cons |
|---|---|---|
| **A) TelegramUI `Skeleton` component** | Native TGUI look | Limited customization |
| **B) Custom CSS pulse skeletons** | Full control, lightweight | Doesn't match TGUI exactly |
| **C) Hybrid: TGUI `Cell`/`Section` with shimmer overlay** | Matches real layout perfectly | More markup |

**Chosen: A — TelegramUI `Skeleton` component.** TelegramUI v2 includes a `Skeleton` component (`@telegram-apps/telegram-ui`). Using it directly ensures visual consistency with the rest of the TGUI components. We'll create skeleton variants for each page: `AssetsSkeleton`, `PricesSkeleton`, `CalculatorSkeleton`.

### Decision 5: Pull-to-Refresh Mechanism

**Options considered:**

| Approach | Pros | Cons |
|---|---|---|
| **A) `PullToRefresh` from TGUI** | Built into component library | Need to verify it exists in v2 |
| **B) Custom touch handler + `refetch()`** | Full control | Complex gesture handling |
| **C) Browser native (overscroll-behavior)** | Zero code | Not customizable, varies by browser |

**Chosen: A — TelegramUI `PullToRefresh`.** TelegramUI v2 exports a `PullToRefresh` component that wraps content and triggers a callback on pull. We'll wrap the `List` component on the Prices and Assets pages. Falls back gracefully on non-touch devices.

### Decision 6: viewportStableHeight Handling

**Approach:** Create a `useViewportHeight` hook that:
1. Listens to `WebApp.onEvent('viewportChanged', handler)` to track `viewportStableHeight`.
2. Sets a CSS custom property `--tg-viewport-height` on `document.documentElement`.
3. The Add Asset form and Edit modal use `max-h-[var(--tg-viewport-height)]` to constrain their height, ensuring the quantity input stays visible above the keyboard.

This is lightweight (a single event listener + CSS variable) and avoids complex layout recalculations.

---

## 4. Milestone 3.1 — Telegram SDK Polish

**Goal:** Make the app feel indistinguishable from a native Telegram feature.

### Task 3.1.1 — `useTelegramMainButton` Hook

**New file:** `src/hooks/use-telegram-main-button.ts`

```typescript
interface MainButtonConfig {
  text: string
  onClick: () => void
  isVisible?: boolean
  isLoading?: boolean
}

export function useTelegramMainButton(config: MainButtonConfig): void
```

**Behavior:**
- On mount with `isVisible: true`: calls `WebApp.MainButton.setText(text)`, `WebApp.MainButton.show()`, `WebApp.MainButton.onClick(handler)`.
- When `isLoading` changes: calls `WebApp.MainButton.showProgress()` / `WebApp.MainButton.hideProgress()`.
- When `text` changes: calls `WebApp.MainButton.setText(text)`.
- On unmount or `isVisible: false`: calls `WebApp.MainButton.offClick(handler)`, `WebApp.MainButton.hide()`.
- Uses a stable ref pattern (like `useTelegramBackButton`) to avoid re-subscribing on every render.
- **Guard:** If `WebApp.MainButton` is not available (standalone web), the hook is a no-op.

**Files modified:**
- `src/app/[locale]/(app)/assets/add/page.tsx` — Wire MainButton as "ذخیره" when asset selected + quantity entered. Pass `isPending` from mutation as `isLoading`. Hide the existing bottom `<Button>` in `AssetPicker` when MainButton is available.
- `src/app/[locale]/(app)/calculator/page.tsx` — Wire MainButton as "تبدیل" (Convert). Not strictly necessary since conversion is live, but provides a native feel for the primary action. The MainButton here can trigger haptic feedback as confirmation.

**Approach for dual rendering (Telegram vs standalone):**

Create a utility `isTelegramWebApp()` in `src/utils/telegram.ts` that returns `true` if running inside Telegram. When inside Telegram, `AssetPicker` hides its inline Save button and relies on MainButton. When standalone, the inline button remains.

### Task 3.1.2 — `useTelegramHaptics` Hook

**New file:** `src/hooks/use-telegram-haptics.ts`

```typescript
interface HapticsAPI {
  impactOccurred: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

export function useTelegramHaptics(): HapticsAPI
```

**Behavior:**
- Returns stable functions that call `WebApp.HapticFeedback.impactOccurred()`, etc.
- No-op when `WebApp.HapticFeedback` is unavailable.

**Integration points:**
- `AssetPicker` / `assets.add` mutation `onSuccess` → `notificationOccurred('success')`
- `AssetPicker` / `assets.add` mutation `onError` → `notificationOccurred('error')`
- `AssetListItem` / `assets.update` mutation `onSuccess` → `notificationOccurred('success')`
- `AssetListItem` / `assets.delete` mutation `onSuccess` → `impactOccurred('medium')`
- Calculator swap button → `selectionChanged()`
- Bottom nav tab switch → `selectionChanged()`

### Task 3.1.3 — `useViewportHeight` Hook

**New file:** `src/hooks/use-viewport-height.ts`

```typescript
export function useViewportHeight(): void
```

**Behavior:**
1. On mount: sets `--tg-viewport-height` CSS variable to `WebApp.viewportStableHeight + 'px'`.
2. Subscribes to `WebApp.onEvent('viewportChanged', ...)` — updates the CSS variable on each change.
3. On unmount: unsubscribes.
4. No-op when outside Telegram.

**Integration:**
- Called once in `TelegramProvider` (fires globally).
- `src/styles/globals.css` — add a utility: `--tg-viewport-height: 100svh` (default fallback).
- The Add Asset page and edit modal use `max-h-[var(--tg-viewport-height,100svh)]` with `overflow-y-auto` to ensure content scrolls within the visible viewport when the keyboard is open.

### Task 3.1.4 — `themeParams` Sync

**File modified:** `src/components/telegram-provider.tsx`

**Current state:** `AppRoot` reads `WebApp.colorScheme` once at render time. If the user changes Telegram's theme while the app is open, the app won't update.

**Change:** Add a `useEffect` that subscribes to `WebApp.onEvent('themeChanged', handler)`. On theme change, update the `appearance` prop of `AppRoot` by storing `colorScheme` in state:

```typescript
const [appearance, setAppearance] = useState<'light' | 'dark'>(WebApp.colorScheme)

useEffect(() => {
  const handler = () => setAppearance(WebApp.colorScheme)
  WebApp.onEvent('themeChanged', handler)
  return () => WebApp.offEvent('themeChanged', handler)
}, [])
```

This ensures TGUI components re-render with the correct theme variables when Telegram's theme changes.

**Effort: ~1.25 days total for Milestone 3.1**

---

## 5. Milestone 3.2 — Portfolio Time-Series Charts

**Goal:** Show users how their total net worth has changed over time — the P1 retention driver.

### Task 3.2.1 — Portfolio Snapshot Helper

**New file:** `src/lib/portfolio.ts`

```typescript
export async function createPortfolioSnapshot(
  db: PrismaClient,
  userId: string,
): Promise<PortfolioSnapshot | null>
```

**Logic:**
1. Fetch user's assets: `db.userAsset.findMany({ where: { userId } })`.
2. Fetch latest price snapshot: `db.priceSnapshot.findFirst({ orderBy: { snapshotAt: 'desc' } })`.
3. If no assets or no prices → return `null`.
4. Deduplicate: check if a snapshot exists for this user within the last 5 minutes → skip if so.
5. Compute `totalIRT` = sum of `quantity × sellPrice` for each asset.
6. Build `breakdown` = `[{ symbol, quantity, valueIRT }]` for each asset.
7. Create `db.portfolioSnapshot.create({ data: { userId, totalIRT, breakdown } })`.

This function is shared between the cron job and the asset mutation handlers.

### Task 3.2.2 — Daily Cron Integration

**File modified:** `src/app/api/cron/prices/route.ts`

After saving the new `PriceSnapshot` and pruning old snapshots, add a new step:

```
// Step 3: Create daily portfolio snapshots for all active users
const activeUsers = await db.user.findMany({
  where: { assets: { some: {} } },
  select: { id: true },
})

let portfolioCount = 0
for (const user of activeUsers) {
  const snap = await createPortfolioSnapshot(db, user.id)
  if (snap) portfolioCount++
}
```

**Performance consideration:** This iterates all active users sequentially. For v1 with a small user base (< 1,000), this is fine. If scale becomes an issue, batch with `Promise.allSettled` (groups of 10) or move to a dedicated cron route.

Also add pruning for portfolio snapshots older than 365 days (keep 1 year of history).

**Response update:** Include `portfolioSnapshotCount` in the JSON response.

### Task 3.2.3 — On-Mutation Snapshot

**File modified:** `src/server/api/routers/assets.ts`

After each successful `add`, `update`, or `delete` mutation, call `createPortfolioSnapshot(ctx.db, ctx.user.id)`. The 5-minute deduplication window in the helper prevents excessive writes from rapid edits.

```typescript
add: protectedProcedure
  .input(...)
  .mutation(async ({ ctx, input }) => {
    const asset = await ctx.db.userAsset.upsert({ ... })
    // Fire-and-forget — don't block the mutation response
    void createPortfolioSnapshot(ctx.db, ctx.user.id)
    return asset
  }),
```

The snapshot is fire-and-forget (`void`) — the user doesn't wait for it. If it fails, it's logged but doesn't affect the mutation.

### Task 3.2.4 — tRPC `portfolio.history` Endpoint

**New file:** `src/server/api/routers/portfolio.ts`

```typescript
export const portfolioRouter = router({
  history: protectedProcedure
    .input(z.object({
      days: z.number().int().min(1).max(365).default(30),
    }).optional())
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30
      const since = new Date()
      since.setDate(since.getDate() - days)

      const snapshots = await ctx.db.portfolioSnapshot.findMany({
        where: {
          userId: ctx.user.id,
          snapshotAt: { gte: since },
        },
        orderBy: { snapshotAt: 'asc' },
        select: {
          snapshotAt: true,
          totalIRT: true,
        },
      })

      return snapshots.map(s => ({
        date: s.snapshotAt,
        totalIRT: Number(s.totalIRT),
      }))
    }),
})
```

**File modified:** `src/server/api/root.ts` — Add `portfolio: portfolioRouter` to the root router.

### Task 3.2.5 — Install Recharts

```bash
pnpm add recharts
```

Add `recharts` to `optimizePackageImports` in `next.config.ts`.

### Task 3.2.6 — Portfolio Chart Component

**New file:** `src/components/portfolio-chart.tsx`

```typescript
interface PortfolioChartProps {
  data: Array<{ date: Date; totalIRT: number }>
}
```

**Implementation:**
- Uses `ResponsiveContainer` + `LineChart` + `Line` + `XAxis` + `YAxis` + `Tooltip` from Recharts.
- **Colors:** Uses TGUI CSS variables via `getComputedStyle()`:
  - Line stroke: `var(--tgui--accent_text_color)` (Telegram's accent color)
  - Grid: `var(--tgui--divider)`
  - Tooltip background: `var(--tgui--card_bg_color)`
  - Tooltip text: `var(--tgui--text_color)`
- **X-axis:** Dates formatted with `date-fns-jalali` (Persian calendar) when locale is `fa`, or standard `date-fns` for `en`. Show abbreviated month + day (e.g., "۲۵ اسفند" or "Mar 15").
- **Y-axis:** Formatted with `formatIRT()` (abbreviated — e.g., "۱.۲M" for 1,200,000). Hide Y-axis labels on small screens (< 360px width) to save space.
- **RTL:** The chart itself renders LTR (numbers flow left-to-right even in RTL contexts). The container has `dir="ltr"` explicitly.
- **Empty state:** If `data.length < 2`, show a `Placeholder` with a message like "دو روز دیگر نمودار شما نمایش داده می‌شود" (Your chart will appear in two more days).
- **Interactions:** Tap on a data point shows a tooltip with the exact date and formatted value.

### Task 3.2.7 — Integrate Chart into My Assets Page

**File modified:** `src/app/[locale]/(app)/page.tsx`

Add a new `Section` between the portfolio total and the asset list:

```tsx
<Section header={t('portfolioChart')}>
  <PortfolioChart data={historyData} />
</Section>
```

The chart data comes from `api.portfolio.history.useQuery({ days: 30 })`. The query is optional — if it returns empty data, the chart shows its empty state.

**Chart period selector (stretch goal):** A `SegmentedControl` from TGUI with options: 7d / 30d / 90d / 1y. Defaults to 30d. Changes the `days` parameter of the query.

### Task 3.2.8 — Per-Asset Value Chart (Could — Post-v1)

**Deferred.** This requires a per-asset detail page and per-asset historical data extraction from `breakdown` JSON. The `breakdown` field in `PortfolioSnapshot` stores `{ symbol, quantity, valueIRT }[]`, so the data is available for future extraction. No work needed in Phase 3 beyond ensuring the `breakdown` field is populated correctly in Task 3.2.1.

**Effort: ~3 days total for Milestone 3.2**

---

## 6. Milestone 3.3 — Price List UX

**Goal:** Make the price list searchable and refreshable.

### Task 3.3.1 — Search/Filter UI on Price List

**File modified:** `src/app/[locale]/(app)/prices/page.tsx`

Add a search `Input` at the top of the page:

```tsx
const [search, setSearch] = useState('')

const prices = parsePriceSnapshot(data?.data)
const filtered = filterPriceItems(prices, search) // Already implemented in lib/prices.ts
const grouped = groupByCategory(filtered)
const entries = sortedGroupEntries(grouped)
```

The `Input` component is from TelegramUI. It includes:
- `type="search"` for native clear button on mobile.
- `placeholder` in Persian: "جستجو..." (same as the asset picker).
- `onChange` filters instantly (no debounce needed — `filterPriceItems` is O(n) on ~281 items).

The search input is placed inside a `Section` with a `FixedLayout` (or sticky positioning) so it stays visible while scrolling the list.

**No results state:** When `entries.length === 0` and `search` is non-empty, show a `Placeholder` with "نتیجه‌ای یافت نشد" (No results found).

### Task 3.3.2 — Pull-to-Refresh

**Approach:** Use TelegramUI's `PullToRefresh` component if available, otherwise implement using `WebApp.onEvent('viewportChanged')` + touch gesture.

**Files modified:**
- `src/app/[locale]/(app)/prices/page.tsx` — Wrap the `List` in a `PullToRefresh` that calls `refetch()` from the tRPC query.
- `src/app/[locale]/(app)/page.tsx` — Same wrapping for the assets list.

```tsx
<PullToRefresh onRefresh={async () => { await refetch() }}>
  <List>
    {/* existing content */}
  </List>
</PullToRefresh>
```

If TelegramUI's `PullToRefresh` doesn't suit the needs, fall back to a lightweight custom implementation:
1. Detect `touchstart` → `touchmove` (downward, at scroll position 0) → `touchend`.
2. Show a spinning indicator.
3. Call `refetch()` and hide the indicator on complete.

**Effort: ~1 day total for Milestone 3.3**

---

## 7. Milestone 3.4 — Error, Empty & Loading States

**Goal:** No blank screens. Every state the user can encounter should have a polished, informative UI.

### Task 3.4.1 — Loading Skeletons

**New files:**
- `src/components/skeletons/assets-skeleton.tsx`
- `src/components/skeletons/prices-skeleton.tsx`
- `src/components/skeletons/calculator-skeleton.tsx`

Each skeleton mirrors the real page layout using TelegramUI's `Skeleton` component:

**Assets Skeleton:**
```
┌─────────────────────────────┐
│  Section: "ارزش کل"          │
│  ┌─────────────────────────┐ │
│  │  ████████  (large title) │ │
│  │  ████  (toman label)     │ │
│  └─────────────────────────┘ │
│                              │
│  Section: "دارایی‌های من"      │
│  ┌─────────────────────────┐ │
│  │ ○ ██████  ████████  ██ │ │  ← Cell skeleton (avatar + text + value)
│  │ ○ ██████  ████████  ██ │ │
│  │ ○ ██████  ████████  ██ │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

**Prices Skeleton:**
```
┌─────────────────────────────┐
│  Section: ████████            │
│  ┌─────────────────────────┐ │
│  │ ○ ██████████  ████████ │ │  × 5 rows
│  └─────────────────────────┘ │
│  Section: ████████            │
│  ┌─────────────────────────┐ │
│  │ ○ ██████████  ████████ │ │  × 5 rows
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

**Calculator Skeleton:**
```
┌─────────────────────────────┐
│  Section: "ماشین حساب"        │
│  ┌─────────────────────────┐ │
│  │  ████████ (From selector)│ │
│  │  ⇅ (swap icon)           │ │
│  │  ████████ (To selector)  │ │
│  │  ████████ (Amount input) │ │
│  └─────────────────────────┘ │
│  Section: "نتیجه"             │
│  ┌─────────────────────────┐ │
│  │  ████████ (result)       │ │
│  └─────────────────────────┘ │
└─────────────────────────────┘
```

**Integration:** Replace the `isLoading` spinner blocks in each page with the corresponding skeleton component:

```tsx
// Before (current)
if (isLoading) {
  return <div className="flex min-h-svh items-center justify-center"><Spinner size="l" /></div>
}

// After
if (isLoading) {
  return <AssetsSkeleton />
}
```

### Task 3.4.2 — Error: Ecotrust API Down / Snapshot Missing

**Current behavior:** If no `PriceSnapshot` exists, the Price List shows a `Placeholder` with "قیمت‌ها در دسترس نیست". The Assets page shows `valueIRT: 0` for all assets (since `parsePriceSnapshot` returns `[]`).

**Improved behavior:**

1. **Price List page:** Keep the current `Placeholder` but add a retry button and a timestamp of the last known snapshot (if any). If a stale snapshot exists (> 60 min), show it with a prominent staleness banner at the top:
   ```
   ⚠️ آخرین به‌روزرسانی: ۲ ساعت پیش
   ```
   This uses `data?.snapshotAt` and `data?.stale` from the existing `prices.latest` response.

2. **Assets page:** If `data.stale` is true, show a subtle banner below the portfolio total:
   ```
   قیمت‌ها ممکن است به‌روز نباشد
   ```
   Values still show (using the stale snapshot), but the user is informed.

3. **Calculator page:** If no prices available, show a Placeholder instead of empty selectors. If stale, show a staleness note below the result.

**Files modified:**
- `src/app/[locale]/(app)/prices/page.tsx` — Add staleness banner + retry button.
- `src/app/[locale]/(app)/page.tsx` — Add staleness banner below `PortfolioTotal`.
- `src/app/[locale]/(app)/calculator/page.tsx` — Add staleness indicator.
- `src/components/staleness-banner.tsx` — **New shared component** for the staleness warning.

### Task 3.4.3 — Error: `initData` Validation Failure

**Current behavior:** If `initData` validation fails in the tRPC context, `telegramUserId` is `null`, and `protectedProcedure` throws `UNAUTHORIZED`. The client sees a TRPCClientError which triggers the error boundary.

**Improved behavior:**

1. **Client-side detection:** Create a `useAuthStatus` hook that checks:
   - Is `getRawInitData()` returning data? (Mini app mode)
   - Is there a NextAuth session? (Standalone mode)
   - Is the dev bypass active?
   If none, redirect to `/login` before any tRPC call fails.

2. **Error boundary enhancement:** In `src/app/[locale]/(app)/error.tsx`, detect `UNAUTHORIZED` errors specifically and show a dedicated message:
   ```
   نشست شما منقضی شده است. لطفاً دوباره وارد شوید.
   ```
   With a "ورود مجدد" (Re-login) button that navigates to `/login`.

3. **tRPC error handling:** In `src/trpc/react.tsx`, add a global `onError` handler in the query client that detects `UNAUTHORIZED` and redirects to login.

### Task 3.4.4 — Error: DB Connection Failure

**Current behavior:** Prisma connection errors throw unhandled exceptions that hit the route-level error boundary.

**Improved behavior:**

The existing `error.tsx` already catches these with a generic "خطایی رخ داد" message and retry button. This is sufficient for v1. The improvement is:

1. Add error logging: ensure all tRPC procedures log errors to the server console (already done via tRPC's `onError` in development; verify production logging).
2. In the error boundary, check if `error.message` contains common Prisma error strings and show a friendlier message:
   ```
   مشکلی در اتصال به سرور رخ داد. لطفاً چند لحظه دیگر تلاش کنید.
   ```

**Effort: ~1.5 days total for Milestone 3.4**

---

## 8. Milestone 3.5 — Production Deployment

**Goal:** Ship the app to production on Vercel with a working Telegram mini app.

### Task 3.5.1 — Vercel Project Setup

1. Create a Vercel project linked to the Git repository.
2. Set all environment variables in Vercel Dashboard:
   - `DATABASE_URL` — Neon Serverless connection string (pooled, `?sslmode=require`)
   - `DIRECT_URL` — Neon direct connection string (for Prisma migrations)
   - `NEXTAUTH_SECRET` — Random 32+ char string (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — Production URL (e.g., `https://cheghadr.vercel.app`)
   - `TELEGRAM_BOT_TOKEN` — From BotFather
   - `CRON_SECRET` — Random string; the external scheduler (e.g. cron-job.org) must send `Authorization: Bearer <CRON_SECRET>` on cron requests
   - `NEXT_PUBLIC_ECOTRUST_API_URL` — Ecotrust API base URL
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — Bot username without `@`
3. Deploy with `vercel --prod` or push to `main` branch.

### Task 3.5.2 — Production Database Migration

```bash
# Run from local machine or CI with DIRECT_URL set
DATABASE_URL=$DIRECT_URL npx prisma migrate deploy
```

Verify all 4 models exist: `User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot`.

### Task 3.5.3 — BotFather Registration

1. Open BotFather in Telegram.
2. `/setmenubutton` → Select the bot → Set URL to production URL.
3. `/newapp` or `/setapp` → Register the mini app URL.
4. Verify the mini app opens from the bot's menu button.

### Task 3.5.4 — Verify Cron Job

1. In **[cron-job.org](https://cron-job.org)** (or your scheduler), confirm jobs exist for `/api/cron/prices` and (if applicable) `/api/cron/portfolio` with the `Authorization: Bearer $CRON_SECRET` header. We do **not** use Vercel Cron; `vercel.json` has no `crons` entry. Schedules and URLs: [`docs/cron-scheduling.md`](./cron-scheduling.md).
2. Trigger a manual run via curl:
   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://cheghadr.vercel.app/api/cron/prices
   ```
3. Verify a `PriceSnapshot` was created in the database.

### Task 3.5.5 — Smoke Test Checklist

**In-Telegram flow:**
- [ ] Open bot menu button → Mini app loads
- [ ] `initData` validation succeeds → no login screen
- [ ] Bottom tabs navigate between Assets / Prices / Calculator
- [ ] Add an asset (e.g., 10 USD) → asset appears with IRT value
- [ ] Edit the asset → quantity updates
- [ ] Delete the asset → removed from list
- [ ] Price list shows grouped assets with prices
- [ ] Calculator converts USD → IRT correctly
- [ ] BackButton works on Add Asset page
- [ ] Theme matches Telegram's current theme (light/dark)

**Standalone web flow:**
- [ ] Open production URL in browser → redirect to login page
- [ ] Telegram Login Widget appears
- [ ] After login → redirect to assets page
- [ ] All CRUD operations work
- [ ] Session persists across page refreshes

**Edge cases:**
- [ ] Cold start (no PriceSnapshot yet) → graceful empty states
- [ ] Stale snapshot (> 60 min) → staleness indicator shows
- [ ] Invalid/expired session → redirect to login with message

**Effort: ~2 days total for Milestone 3.5**

---

## 9. Dependency Graph & Task Order

```
Phase 3 Task Dependencies
═════════════════════════

Week 5, Day 1-2:
  ┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
  │ 3.1.1        │     │ 3.2.1            │     │ 3.4.1            │
  │ MainButton   │     │ Portfolio helper  │     │ Skeletons        │
  │ hook         │     │ (lib/portfolio)   │     │ (3 components)   │
  └──────┬───────┘     └────────┬─────────┘     └──────────────────┘
         │                      │
  ┌──────┴───────┐     ┌────────┴─────────┐
  │ 3.1.2        │     │ 3.2.2            │
  │ Haptics hook │     │ Daily cron        │
  └──────┬───────┘     │ integration       │
         │             └────────┬─────────┘
  ┌──────┴───────┐              │
  │ 3.1.3        │     ┌────────┴─────────┐
  │ Viewport     │     │ 3.2.3            │
  │ height hook  │     │ On-mutation       │
  └──────┬───────┘     │ snapshot          │
         │             └────────┬─────────┘
  ┌──────┴───────┐              │
  │ 3.1.4        │     ┌────────┴─────────┐
  │ themeParams  │     │ 3.2.4            │
  │ sync         │     │ tRPC portfolio   │
  └──────────────┘     │ .history         │
                       └────────┬─────────┘

Week 5, Day 3-4:
  ┌──────────────┐     ┌────────┴─────────┐     ┌──────────────────┐
  │ 3.3.1        │     │ 3.2.5            │     │ 3.4.2            │
  │ Price search │     │ Install Recharts │     │ Staleness banner │
  │ UI           │     └────────┬─────────┘     └──────────────────┘
  └──────┬───────┘              │
         │             ┌────────┴─────────┐     ┌──────────────────┐
  ┌──────┴───────┐     │ 3.2.6            │     │ 3.4.3            │
  │ 3.3.2        │     │ Chart component  │     │ Auth error       │
  │ Pull to      │     └────────┬─────────┘     │ handling         │
  │ refresh      │              │               └──────────────────┘
  └──────────────┘     ┌────────┴─────────┐
                       │ 3.2.7            │     ┌──────────────────┐
                       │ Chart → Assets   │     │ 3.4.4            │
                       │ page integration │     │ DB error         │
                       └──────────────────┘     │ handling         │
                                                └──────────────────┘

Week 5, Day 5:
  ┌──────────────────────────────────────────────────────────────────┐
  │ 3.5 — Production Deployment                                      │
  │ 3.5.1 Vercel setup → 3.5.2 DB migration → 3.5.3 BotFather      │
  │ → 3.5.4 Cron verify → 3.5.5 Smoke tests                        │
  └──────────────────────────────────────────────────────────────────┘
```

**Recommended implementation order:**

| Day | Morning | Afternoon |
|---|---|---|
| **Day 1** | 3.2.1 Portfolio helper + 3.2.2 Cron integration | 3.2.3 On-mutation snapshot + 3.2.4 tRPC endpoint |
| **Day 2** | 3.1.1 MainButton hook + 3.1.2 Haptics hook | 3.1.3 Viewport hook + 3.1.4 Theme sync |
| **Day 3** | 3.2.5 Install Recharts + 3.2.6 Chart component | 3.2.7 Chart integration into Assets page |
| **Day 4** | 3.3.1 Price search UI + 3.3.2 Pull-to-refresh | 3.4.1 Loading skeletons (all 3 pages) |
| **Day 5** | 3.4.2 Staleness banner + 3.4.3 Auth errors + 3.4.4 DB errors | 3.5.x Production deployment + smoke tests |

**Rationale:** Portfolio snapshots go first because the cron needs to start accumulating data ASAP for the charts to be meaningful. Telegram SDK polish comes next because it changes how buttons and interactions work across the app. Chart rendering is Day 3 after the backend is ready. Error/loading states and deployment close out the phase.

---

## 10. New i18n Keys

### `messages/fa.json` additions

```json
{
  "assets": {
    "portfolioChart": "روند ارزش دارایی‌ها",
    "chartEmpty": "نمودار شما پس از دو روز نمایش داده می‌شود",
    "chartPeriod7": "۷ روز",
    "chartPeriod30": "۳۰ روز",
    "chartPeriod90": "۹۰ روز",
    "chartPeriod365": "۱ سال",
    "staleWarning": "قیمت‌ها ممکن است به‌روز نباشد",
    "lastUpdated": "آخرین به‌روزرسانی: {time}",
    "sessionExpired": "نشست شما منقضی شده است",
    "reLogin": "ورود مجدد",
    "connectionError": "مشکلی در اتصال به سرور رخ داد",
    "retryLater": "لطفاً چند لحظه دیگر تلاش کنید",
    "mainButtonSave": "ذخیره",
    "mainButtonConvert": "تبدیل"
  },
  "prices": {
    "search": "جستجو...",
    "noResults": "نتیجه‌ای یافت نشد",
    "staleWarning": "آخرین به‌روزرسانی: {time}"
  }
}
```

### `messages/en.json` additions

```json
{
  "assets": {
    "portfolioChart": "Portfolio Trend",
    "chartEmpty": "Your chart will appear after two days",
    "chartPeriod7": "7D",
    "chartPeriod30": "30D",
    "chartPeriod90": "90D",
    "chartPeriod365": "1Y",
    "staleWarning": "Prices may not be up to date",
    "lastUpdated": "Last updated: {time}",
    "sessionExpired": "Your session has expired",
    "reLogin": "Re-login",
    "connectionError": "Unable to connect to the server",
    "retryLater": "Please try again in a moment",
    "mainButtonSave": "Save",
    "mainButtonConvert": "Convert"
  },
  "prices": {
    "search": "Search...",
    "noResults": "No results found",
    "staleWarning": "Last updated: {time}"
  }
}
```

---

## 11. Testing Strategy

### Unit Tests (Vitest)

| Test | File | What it covers |
|---|---|---|
| `createPortfolioSnapshot` | `src/lib/__tests__/portfolio.test.ts` | Correct totalIRT calculation, breakdown format, deduplication window, null when no assets |
| `useTelegramMainButton` | `src/hooks/__tests__/use-telegram-main-button.test.ts` | Show/hide/setText/onClick lifecycle, cleanup on unmount, no-op when SDK unavailable |
| `useTelegramHaptics` | `src/hooks/__tests__/use-telegram-haptics.test.ts` | Calls correct SDK methods, no-op fallback |
| `portfolio.history` | `src/server/api/routers/__tests__/portfolio.test.ts` | Returns correct snapshots for date range, respects user isolation |

### Integration Tests

| Test | What it covers |
|---|---|
| Cron route with portfolio snapshots | After fetching prices, creates PortfolioSnapshot for active users |
| Asset mutation → snapshot creation | Add asset → PortfolioSnapshot is created |

### Manual Testing (Dev Environment)

| Scenario | Steps |
|---|---|
| **MainButton** | Open in Telegram → navigate to Add Asset → select asset → enter quantity → MainButton "ذخیره" appears → tap → asset saved |
| **Haptic feedback** | Save asset → feel impact feedback. Delete → feel medium impact. Error → feel error notification. |
| **Viewport height** | Open Add Asset → tap quantity input → keyboard opens → input remains visible above keyboard |
| **Theme sync** | Open app → switch Telegram to dark mode → app theme updates without restart |
| **Portfolio chart** | Add 2+ assets → wait for cron or trigger manually → chart shows data points |
| **Price search** | Open prices → type "دلار" → only USD-related items shown → clear → all items back |
| **Pull to refresh** | Pull down on prices list → spinner → data refreshes |
| **Skeletons** | Throttle network → reload page → skeleton shows instead of spinner |
| **Staleness** | Stop cron → wait > 60 min → banner appears on all pages |
| **Auth error** | Clear session → navigate → redirected to login with message |

### Pre-Deployment Checks

```bash
pnpm typecheck   # Zero TypeScript errors
pnpm lint         # Zero Biome lint errors
pnpm test         # All unit tests passing
pnpm build        # Production build succeeds
```

---

## 12. Definition of Done

Phase 3 is complete when:

- [ ] **Telegram SDK:** MainButton works on Add Asset and Calculator pages. HapticFeedback fires on save/delete/error. Viewport height adjusts for keyboard. Theme changes propagate live.
- [ ] **Portfolio charts:** Daily cron creates PortfolioSnapshots. Asset mutations trigger snapshots. Chart renders on My Assets page with 30d default view. Period selector works.
- [ ] **Price list UX:** Search input filters prices in real time. Pull-to-refresh works on Prices and Assets pages.
- [ ] **Error/loading states:** All 3 pages show skeleton loading instead of spinner. Staleness banner appears when data is > 60 min old. Auth errors show a clear re-login message. DB errors show a friendly retry message.
- [ ] **Production:** App deployed to Vercel. Mini app registered with BotFather. Cron job runs in production. All smoke tests pass.
- [ ] **Quality:** Zero TypeScript errors. Zero Biome lint errors. All unit tests pass. Production build succeeds.
- [ ] **i18n:** All new strings have Persian (fa) and English (en) translations.

---

## Appendix: Files Created / Modified Summary

### New Files

| File | Purpose |
|---|---|
| `src/hooks/use-telegram-main-button.ts` | MainButton lifecycle hook |
| `src/hooks/use-telegram-haptics.ts` | HapticFeedback wrapper hook |
| `src/hooks/use-viewport-height.ts` | viewportStableHeight → CSS variable |
| `src/lib/portfolio.ts` | `createPortfolioSnapshot()` shared helper |
| `src/server/api/routers/portfolio.ts` | `portfolio.history` tRPC endpoint |
| `src/components/portfolio-chart.tsx` | Recharts line chart for portfolio history |
| `src/components/staleness-banner.tsx` | Shared staleness warning UI |
| `src/components/skeletons/assets-skeleton.tsx` | Assets page loading skeleton |
| `src/components/skeletons/prices-skeleton.tsx` | Prices page loading skeleton |
| `src/components/skeletons/calculator-skeleton.tsx` | Calculator page loading skeleton |

### Modified Files

| File | Change |
|---|---|
| `src/components/telegram-provider.tsx` | Add `themeChanged` event listener, call `useViewportHeight()` |
| `src/app/[locale]/(app)/page.tsx` | Add chart section, staleness banner, skeleton loading, pull-to-refresh |
| `src/app/[locale]/(app)/prices/page.tsx` | Add search input, staleness banner, skeleton loading, pull-to-refresh |
| `src/app/[locale]/(app)/calculator/page.tsx` | Add staleness indicator, skeleton loading |
| `src/app/[locale]/(app)/assets/add/page.tsx` | Wire MainButton hook |
| `src/app/[locale]/(app)/error.tsx` | Detect UNAUTHORIZED, show re-login UI |
| `src/components/asset-picker.tsx` | Hide inline Save when MainButton active, add haptics |
| `src/components/asset-list-item.tsx` | Add haptics on mutations |
| `src/components/bottom-nav.tsx` | Add haptic `selectionChanged()` on tab switch |
| `src/server/api/routers/assets.ts` | Call `createPortfolioSnapshot` after mutations |
| `src/server/api/root.ts` | Add `portfolio` router |
| `src/app/api/cron/prices/route.ts` | Add portfolio snapshot creation + pruning |
| `next.config.ts` | Add `recharts` to `optimizePackageImports` |
| `messages/fa.json` | Add new i18n keys |
| `messages/en.json` | Add new i18n keys |
| `src/styles/globals.css` | Add `--tg-viewport-height` fallback |
| `docs/cron-scheduling.md` | Production cron-job.org URLs and schedules |

### New Dependencies

| Package | Purpose | Size Impact |
|---|---|---|
| `recharts` | Portfolio line chart | ~45 KB gzip |
