# Phase 2: Core User Features — Implementation Plan

> **Cheghadr? (چه قدر؟)** — Personal Net Worth Tracker  
> Phase 2 ships the three screens that answer "چه قدر؟" (How much?).  
> Source: [PRD](https://www.notion.so/324ba087d94a8114b46aeb2a4d8a7af1) · [Roadmap](https://www.notion.so/324ba087d94a81b5ad78ddbd08b067c4)  
> Estimated effort: ~11.5 days · Target: Week 3–4

---

## Table of Contents

1. [Phase 1 Recap & Starting State](#1-phase-1-recap--starting-state)
2. [Phase 2 Scope](#2-phase-2-scope)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Milestone 2.1 — App Shell & Navigation](#4-milestone-21--app-shell--navigation)
5. [Milestone 2.2 — My Assets Page (دارایی‌های من)](#5-milestone-22--my-assets-page-دارایی‌های-من)
6. [Milestone 2.3 — Price List Page (قیمت‌ها)](#6-milestone-23--price-list-page-قیمتها)
7. [Milestone 2.4 — Calculator Page (ماشین حساب)](#7-milestone-24--calculator-page-ماشین-حساب)
8. [Shared Components & Utilities](#8-shared-components--utilities)
9. [Dependency Graph & Task Order](#9-dependency-graph--task-order)
10. [Testing Strategy](#10-testing-strategy)
11. [Definition of Done](#11-definition-of-done)

---

## 1. Phase 1 Recap & Starting State

Phase 1 delivered the full infrastructure layer. Here's what exists and is ready for Phase 2:

| Component | Status | Key Files |
|---|---|---|
| **Prisma schema** | ✅ 4 models: `User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot` | `prisma/schema.prisma` |
| **tRPC** | ✅ `prices.latest` (public), `assets.list` (protected, placeholder) | `src/server/api/routers/` |
| **Auth** | ✅ Dual-path: initData (mini app) + NextAuth JWT (standalone) | `src/server/auth/` |
| **Price snapshots** | ✅ Cron route + staleness detection | `src/app/api/cron/prices/route.ts` |
| **TelegramUI** | ✅ `AppRoot` wrapping app, `expand()`, `ready()`, `colorScheme` | `src/components/telegram-provider.tsx` |
| **RTL + Persian** | ✅ `lang="fa"` / `dir="rtl"` on root | `src/app/layout.tsx` |
| **Route protection** | ✅ `proxy.ts` redirects unauthenticated to `/login` | `src/proxy.ts` |
| **UI toolkit** | ✅ shadcn `Button` + `Sonner` (toast) + Tabler icons | `src/components/ui/` |
| **Ecotrust types** | ✅ Kubb-generated: `PriceItem`, `PricesResponse`, `CategorySymbol`, `CurrencyInfo` | `src/modules/API/Swagger/ecotrust/gen/models/` |

### What Phase 2 Builds On

- The home page (`src/app/page.tsx`) is a placeholder — it will become the assets page.
- `assets.list` is a stub that returns `UserAsset[]` — needs `add`, `update`, `delete` procedures.
- No bottom navigation, no form components, no page-specific UI.
- `PriceSnapshot.data` is a JSON blob containing the full Ecotrust `PricesResponse` — Phase 2 parses this into grouped, displayable data.

---

## 2. Phase 2 Scope

Phase 2 delivers four milestones from the roadmap:

| Milestone | Deliverable | Effort |
|---|---|---|
| **2.1** App Shell & Navigation | Bottom tab bar, BackButton, RTL layout, global error boundary | ~2.25d |
| **2.2** My Assets Page | Full CRUD, live valuation, portfolio total, empty state | ~4.75d |
| **2.3** Price List Page | Grouped by category, sell price, change %, staleness badge | ~2d |
| **2.4** Calculator Page | From/to selectors, amount input, swap, real-time conversion | ~2d |

**Total: ~11 days + 0.5d buffer**

By end of Phase 2, the app is **functionally complete for MVP**: a user can log in, add assets, see live prices, and convert between assets.

---

## 3. Architecture Decisions

### Decision 1: Route Structure

**Chosen approach:** Route group `(app)` with a shared layout containing the bottom tab bar.

```
src/app/
├── layout.tsx                    # Root layout (providers, RTL, fonts)
├── login/page.tsx                # Standalone login (no tab bar)
├── (app)/
│   ├── layout.tsx                # App layout (bottom tab bar)
│   ├── page.tsx                  # My Assets (default tab, replaces old placeholder)
│   ├── prices/page.tsx           # Price List
│   ├── calculator/page.tsx       # Calculator
│   └── assets/
│       └── add/page.tsx          # Add Asset (sub-page with BackButton)
└── api/                          # API routes (unchanged)
```

**Rationale:**
- Route group `(app)` scopes the tab bar layout to the three main pages.
- `/login` stays outside the group — no tab bar on the login page.
- The default route `/` maps to My Assets, matching the PRD: "total portfolio value in IRT prominently displayed" as the first thing users see.
- The Add Asset form gets its own route (`/assets/add`) to enable Telegram BackButton navigation.

### Decision 2: Component Library Mix

**TelegramUI components** for in-Telegram-native UX:
- `Tabbar` + `TabbarItem` — bottom navigation
- `Section` + `Cell` — list sections and rows (prices, assets)
- `Input` — form text inputs
- `IconButton` — action buttons (edit, delete, swap)
- `Placeholder` — empty states
- `Spinner` — loading indicators

**shadcn components** for custom UI that TelegramUI doesn't cover:
- `Button` — primary actions (already exists)
- `Sonner` — toast notifications (already exists)
- Additional components as needed: `Dialog`, `Select` (via `shadcn add`)

**Rationale:** TelegramUI provides Telegram-native look and feel. shadcn fills gaps. Both share the same design tokens via CSS variables.

### Decision 3: Asset Selector Pattern

The "Add Asset" form requires selecting an asset symbol from the latest price snapshot. The list has ~100+ items across 14 categories.

**Chosen approach:** Full-page searchable list (not a dropdown).

- Navigate to `/assets/add` → shows a searchable list of all assets from the latest price snapshot.
- User types to filter (Persian or English name).
- Tapping an asset reveals an inline quantity input row directly below the selected item (expanding panel pattern).
- Uses `Telegram.WebApp.BackButton` to return to the assets list.

**Rationale:** A dropdown with 100+ items is unusable on mobile. A full-page list with search is the standard Telegram Mini App pattern and works well with BackButton navigation.

### Decision 4: Price Data Parsing Strategy

`PriceSnapshot.data` stores the full Ecotrust response as a JSON blob. Phase 2 needs to parse this into typed, grouped data on both server and client.

**Chosen approach:** Shared utility function that parses the JSON blob into typed arrays.

```typescript
// src/lib/prices.ts
import type { PriceItem, PricesResponse } from '@/modules/API/Swagger/ecotrust/gen/models'

export function parsePriceSnapshot(data: unknown): PriceItem[] {
  const response = data as PricesResponse
  return response?.data ?? []
}

export function groupByCategory(items: PriceItem[]): Map<string, PriceItem[]> {
  // Group by base_currency.category.symbol
}

export function findBySymbol(items: PriceItem[], symbol: string): PriceItem | undefined {
  // Match on base_currency.symbol (e.g., "USD", "BTC", "GOLD_18K")
}
```

**Rationale:** Keeps the PriceSnapshot storage simple (JSON blob) while providing typed access. The Kubb-generated types give us full type safety without manual type definitions.

### Decision 5: Valuation Computation

Per-asset IRT value = `quantity × sell_price`. Total portfolio = sum of all per-asset values.

**Chosen approach:** Compute on the server in tRPC procedures. Return pre-computed values to the client.

The `assets.list` procedure will be enhanced to return enriched data:
```typescript
{
  assets: Array<{
    id: string
    symbol: string
    quantity: Decimal
    valueIRT: number          // quantity × sell_price
    assetName: string         // name.fa from snapshot
    assetIcon: string | null  // png from snapshot
    change: string | null     // change % from snapshot
  }>
  totalIRT: number            // sum of all valueIRT
  snapshotAt: Date | null     // when prices were last updated
  stale: boolean              // staleness flag
}
```

**Rationale:** Server-side computation avoids sending the full price snapshot to the client just to multiply numbers. It also ensures consistent rounding and avoids floating-point issues in the browser.

### Decision 6: Auto-Refresh Strategy

Per the roadmap: "values stay current without manual refresh."

**Chosen approach:** tRPC React Query polling with `refetchInterval`.

- `assets.list` and `prices.latest` use `refetchInterval: 30 * 60 * 1000` (30 minutes) to match the cron schedule.
- On window focus, React Query's `refetchOnWindowFocus` (enabled by default) triggers a refresh.
- No WebSocket or SSE — polling is sufficient for 30-minute update intervals.

**Rationale:** Simple, reliable, no additional infrastructure. The 30-minute polling matches the server cron schedule (production: **cron-job.org** — `docs/cron-scheduling.md`).

---

## 4. Milestone 2.1 — App Shell & Navigation

**Goal:** The three-tab app shell with Telegram-native navigation.

### Task 2.1.1 — Route Group & App Layout (~0.5d)

Create the `(app)` route group with a layout containing the bottom tab bar.

**New file: `src/app/(app)/layout.tsx`**

```typescript
import type { ReactNode } from 'react'
import { BottomNav } from '@/components/layout/bottom-nav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1 pb-[var(--tabbar-height)]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
```

**Move and update:** `src/app/page.tsx` → `src/app/(app)/page.tsx` (becomes My Assets page).

### Task 2.1.2 — Bottom Tab Bar Component (~0.5d)

**New file: `src/components/bottom-nav.tsx`**

Uses TelegramUI's `Tabbar` and `TabbarItem`:

```typescript
'use client'
import { Tabbar } from '@telegram-apps/telegram-ui'
import { usePathname, useRouter } from 'next/navigation'
import { IconCoins, IconCalculator, IconChartLine } from '@tabler/icons-react'

const tabs = [
  { id: 'assets',     path: '/',            label: 'دارایی‌های من',  icon: IconCoins },
  { id: 'prices',     path: '/prices',      label: 'قیمت‌ها',       icon: IconChartLine },
  { id: 'calculator', path: '/calculator',  label: 'ماشین حساب',    icon: IconCalculator },
]
```

**Implementation notes:**
- Use `usePathname()` to highlight the active tab.
- TelegramUI `Tabbar` renders as a fixed bottom bar matching Telegram's native tab design.
- If `Tabbar` doesn't exist in the version we have, fall back to a custom fixed-bottom bar with TelegramUI `Cell` items or pure Tailwind.
- CSS variable `--tabbar-height` used by the layout to pad content above the bar. Define in `globals.css`: `--tabbar-height: 64px` (adjust to match actual TelegramUI Tabbar height).

### Task 2.1.3 — Telegram BackButton Integration (~0.5d)

**New file: `src/hooks/use-telegram-back-button.ts`**

```typescript
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function useTelegramBackButton(show: boolean) {
  const router = useRouter()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg) return

    if (show) {
      tg.BackButton?.show()
      const handler = () => router.back()
      tg.BackButton?.onClick(handler)
      return () => {
        tg.BackButton?.offClick(handler)
        tg.BackButton?.hide()
      }
    }

    tg.BackButton?.hide()
  }, [show, router])
}
```

**Usage:** Sub-pages (Add Asset) call `useTelegramBackButton(true)`. Root tab pages don't need it (tab bar handles navigation).

**Extend `src/types/telegram.d.ts`** to add `BackButton` methods:
```typescript
BackButton?: {
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
  isVisible: boolean
}
```

### Task 2.1.4 — `Telegram.WebApp.expand()` on App Load (~0.25d)

Already implemented in `src/components/telegram-provider.tsx`. Verify it runs on first load inside the `(app)` layout. No additional work needed.

### Task 2.1.5 — Global Error Boundary (~0.5d)

**New file: `src/app/(app)/error.tsx`**

Next.js App Router error boundary. Catches tRPC errors, network failures, and unhandled exceptions within the app group.

```typescript
'use client'
export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
      <IconAlertTriangle size={48} className="text-destructive" />
      <h2 className="font-semibold text-lg">خطایی رخ داد</h2>
      <p className="text-muted-foreground text-sm">{error.message || 'لطفاً دوباره تلاش کنید'}</p>
      <Button onClick={reset}>تلاش مجدد</Button>
    </div>
  )
}
```

Also create `src/app/(app)/loading.tsx` with a centered `Spinner` for Suspense fallbacks.

### Milestone 2.1 Deliverables Checklist

- [ ] Route group `(app)` with shared layout
- [ ] Bottom tab bar: 3 tabs (دارایی‌ها / قیمت‌ها / ماشین حساب)
- [ ] Active tab highlight based on current route
- [ ] `Telegram.WebApp.BackButton` hook for sub-pages
- [ ] `BackButton` type declarations in `telegram.d.ts`
- [ ] Global error boundary with Persian error messages
- [ ] Loading state with spinner
- [ ] Content area padded above the tab bar

---

## 5. Milestone 2.2 — My Assets Page (دارایی‌های من)

**Goal:** Full CRUD for user assets with live IRT valuation and a prominent portfolio total.

### Task 2.2.1 — tRPC Assets Router: Full CRUD (~1d)

**File: `src/server/api/routers/assets.ts`** — Replace the placeholder with full implementation.

**Procedures:**

```typescript
assets.list     // protectedProcedure.query → enriched assets + total
assets.add      // protectedProcedure.mutation({ symbol, quantity }) → UserAsset
assets.update   // protectedProcedure.mutation({ id, quantity }) → UserAsset
assets.delete   // protectedProcedure.mutation({ id }) → void
```

**`assets.list` — Enhanced response:**

```typescript
list: protectedProcedure.query(async ({ ctx }) => {
  const [userAssets, snapshot] = await Promise.all([
    ctx.db.userAsset.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'asc' },
    }),
    ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    }),
  ])

  const prices = parsePriceSnapshot(snapshot?.data)

  const assets = userAssets.map((asset) => {
    const priceItem = findBySymbol(prices, asset.symbol)
    const sellPrice = priceItem ? Number(priceItem.sell_price) : 0
    const qty = Number(asset.quantity)
    return {
      ...asset,
      valueIRT: qty * sellPrice,
      assetName: priceItem?.name.fa ?? asset.symbol,
      assetNameEn: priceItem?.name.en ?? asset.symbol,
      assetIcon: priceItem?.png ?? null,
      change: priceItem?.change ?? null,
      sellPrice,
    }
  })

  const totalIRT = assets.reduce((sum, a) => sum + a.valueIRT, 0)

  const minutesOld = snapshot
    ? (Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60
    : Infinity
  const stale = minutesOld > 60

  return {
    assets,
    totalIRT,
    snapshotAt: snapshot?.snapshotAt ?? null,
    stale,
  }
})
```

**`assets.add`:**

```typescript
add: protectedProcedure
  .input(z.object({
    symbol: z.string().min(1),
    quantity: z.string().refine((v) => {
      const n = Number(v)
      return !Number.isNaN(n) && n > 0
    }, 'مقدار باید عددی مثبت باشد'),
  }))
  .mutation(async ({ ctx, input }) => {
    return ctx.db.userAsset.upsert({
      where: {
        userId_symbol: { userId: ctx.user.id, symbol: input.symbol },
      },
      update: { quantity: input.quantity },
      create: {
        userId: ctx.user.id,
        symbol: input.symbol,
        quantity: input.quantity,
      },
    })
  })
```

The `upsert` handles the `@@unique([userId, symbol])` constraint gracefully — if the user already has USD, adding USD again updates the quantity instead of erroring.

**Mutation invalidation:** All mutations (`add`, `update`, `delete`) must invalidate the `assets.list` query on success so the UI refreshes. On the client side:

```typescript
const utils = api.useUtils()

const addMutation = api.assets.add.useMutation({
  onSuccess: () => utils.assets.list.invalidate(),
})
```

Apply the same pattern to `update` and `delete` mutations.

**`assets.update`:**

```typescript
update: protectedProcedure
  .input(z.object({
    id: z.string().cuid(),
    quantity: z.string().refine((v) => {
      const n = Number(v)
      return !Number.isNaN(n) && n > 0
    }, 'مقدار باید عددی مثبت باشد'),
  }))
  .mutation(async ({ ctx, input }) => {
    const asset = await ctx.db.userAsset.findUnique({ where: { id: input.id } })
    if (!asset || asset.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    return ctx.db.userAsset.update({
      where: { id: input.id },
      data: { quantity: input.quantity },
    })
  })
```

**`assets.delete`:**

```typescript
delete: protectedProcedure
  .input(z.object({ id: z.string().cuid() }))
  .mutation(async ({ ctx, input }) => {
    const asset = await ctx.db.userAsset.findUnique({ where: { id: input.id } })
    if (!asset || asset.userId !== ctx.user.id) {
      throw new TRPCError({ code: 'NOT_FOUND' })
    }
    await ctx.db.userAsset.delete({ where: { id: input.id } })
  })
```

**Zod v4 note:** The project uses `zod@^4.3.6`. Zod v4 introduced some API changes — `z.string().cuid()` may need to be `z.cuid()` or `z.string().check(z.cuid())`. Verify at implementation time.

### Task 2.2.2 — Price Utilities Module (~0.5d)

**New file: `src/lib/prices.ts`**

Shared utility functions for working with price snapshot data:

```typescript
import type { PriceItem, PricesResponse } from '@/modules/API/Swagger/ecotrust/gen/models'

export function parsePriceSnapshot(data: unknown): PriceItem[] {
  if (!data || typeof data !== 'object') return []
  const response = data as PricesResponse
  return response?.data ?? []
}

export function findBySymbol(items: PriceItem[], symbol: string): PriceItem | undefined {
  return items.find((item) => item.base_currency.symbol === symbol)
}

export function groupByCategory(items: PriceItem[]): Map<string, PriceItem[]> {
  const groups = new Map<string, PriceItem[]>()
  for (const item of items) {
    const cat = item.base_currency.category?.symbol ?? 'OTHER'
    const group = groups.get(cat) ?? []
    group.push(item)
    groups.set(cat, group)
  }
  return groups
}

/** Persian labels for each category */
export const categoryLabels: Record<string, string> = {
  CURRENCY: 'ارز',
  CRYPTOCURRENCY: 'رمزارز',
  GOLD: 'طلا',
  COIN: 'سکه',
  SILVER: 'نقره',
  BORS: 'بورس',
  GOLD_FUNDS: 'صندوق طلا',
  STOCK_FUNDS: 'صندوق سهام',
  FIXED_INCOME_FUNDS: 'صندوق درآمد ثابت',
  MIXED_ASSET_FUNDS: 'صندوق مختلط',
  LEVERAGED_FUNDS: 'صندوق اهرمی',
  SECTOR_FUNDS: 'صندوق بخشی',
  PROPERTY_FUNDS: 'صندوق املاک',
  COMMODITY_SAFFRON_FUNDS: 'صندوق زعفران',
}

/** Format a number as a Toman display string with thousands separators */
export function formatIRT(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(value))
}

/** Format a change percentage with + prefix and color hint */
export function formatChange(change: string | null | undefined): {
  text: string
  positive: boolean
} | null {
  if (!change) return null
  const n = Number(change)
  if (Number.isNaN(n)) return null
  const formatted = new Intl.NumberFormat('fa-IR', {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return { text: `${formatted}%`, positive: n >= 0 }
}
```

### Task 2.2.3 — Portfolio Total Banner (~0.5d)

**New file: `src/components/portfolio-total.tsx`**

The core "چه قدر؟" moment — a prominent display of total net worth.

```typescript
interface PortfolioTotalProps {
  totalIRT: number
  stale: boolean
  snapshotAt: Date | null
}
```

**Design:**
- Large Persian number with thousands separator (e.g., ۱,۲۳۴,۵۶۷,۸۹۰)
- "تومان" suffix
- Staleness badge below (reuse `StalenessBadge`)
- Takes full width at top of My Assets page

### Task 2.2.4 — Asset List UI (~1d)

**New file: `src/components/asset-list-item.tsx`**

Each row shows:
- Asset icon (`png` URL from price snapshot, with fallback)
- Persian name (`name.fa`)
- Quantity (user-entered)
- IRT value (computed)
- Change % (from price snapshot)

**Actions per row:**
- Tap to edit quantity (inline modal or swipe action)
- Delete action (confirmation dialog)

Uses TelegramUI `Cell` component for consistent row styling:
```typescript
<Cell
  before={<Avatar src={assetIcon} size={40} />}
  subtitle={`${quantity} واحد`}
  after={
    <div className="text-left">
      <div className="font-medium">{formatIRT(valueIRT)} ت</div>
      {change && <ChangeLabel change={change} />}
    </div>
  }
>
  {assetName}
</Cell>
```

### Task 2.2.5 — Add Asset Form (~1d)

**New route: `src/app/(app)/assets/add/page.tsx`**

Full-page flow for adding an asset:

1. **Search/filter:** Text input at top filters all assets from the latest price snapshot by Persian or English name.
2. **Asset list:** Grouped by category (CURRENCY, CRYPTO, GOLD, COIN). Each item shows icon, Persian name, current sell price.
3. **Select & enter quantity:** Tapping an asset reveals an inline quantity input row (expanding panel). The user enters the amount and taps "ذخیره" (Save).
4. **Submit:** Calls `assets.add` mutation. On success, navigates back to My Assets with a toast confirmation.

**Components needed:**
- `AssetPicker` — searchable list of all available assets
- `QuantityInput` — numeric input with decimal support

**Telegram SDK integration:**
- `useTelegramBackButton(true)` — shows BackButton to return to assets list
- Consider `Telegram.WebApp.MainButton` for "Save" action (Phase 3 polish item, but we can prepare the hook)

**Data flow:**
```
Latest PriceSnapshot → parsePriceSnapshot() → filter by search term → display grouped list
User taps asset → show quantity input → submit → assets.add mutation → invalidate assets.list → navigate back
```

### Task 2.2.6 — Edit / Delete Asset Actions (~0.5d)

**Edit:**
- Tapping an asset row opens an inline dialog (or bottom sheet) with the quantity pre-filled.
- User edits the number and confirms.
- Calls `assets.update` mutation.

**Delete:**
- Swipe-to-delete or a delete icon button on the row.
- Confirmation dialog (TelegramUI `Modal` or shadcn `AlertDialog`) with Persian text: "آیا مطمئن هستید؟"
- Calls `assets.delete` mutation.

**Both operations:**
- On success: invalidate `assets.list` query (React Query automatic refetch).
- On error: show toast with error message.

### Task 2.2.7 — Empty State (~0.25d)

**New file: `src/components/empty-state.tsx`**

When `assets.list` returns an empty array:

```typescript
<Placeholder
  header="هنوز دارایی اضافه نکرده‌اید"
  description="دارایی‌های خود را اضافه کنید تا ارزش کل سبد خود را ببینید"
  action={<Button onClick={navigateToAdd}>افزودن دارایی</Button>}
/>
```

Uses TelegramUI `Placeholder` component (or a custom design if unavailable).

### Task 2.2.8 — Auto-Refresh on Price Update (~0.5d)

Configure the `assets.list` tRPC query with polling:

```typescript
const { data } = api.assets.list.useQuery(undefined, {
  refetchInterval: 30 * 60 * 1000,  // 30 minutes
  refetchOnWindowFocus: true,
})
```

This ensures:
- Values update automatically when a new price snapshot arrives.
- Returning to the app after backgrounding triggers a refresh.

### Task 2.2.9 — My Assets Page Assembly (~0.5d)

**File: `src/app/(app)/page.tsx`** — Replace the placeholder.

```typescript
'use client'

export default function AssetsPage() {
  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) return <LoadingSpinner />
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />

  return (
    <div>
      <PortfolioTotal totalIRT={data.totalIRT} stale={data.stale} snapshotAt={data.snapshotAt} />
      {data.assets.length === 0 ? (
        <EmptyState />
      ) : (
        <AssetList assets={data.assets} />
      )}
      <FloatingAddButton />
    </div>
  )
}
```

**Loading/error states:** Every page must handle `isLoading` and `isError` from tRPC queries. Use a centered `Spinner` for loading and the error boundary pattern with a retry button for errors.

A floating action button (FAB) or sticky bottom button navigates to `/assets/add`.

### Milestone 2.2 Deliverables Checklist

- [ ] tRPC `assets.add` mutation with `symbol` + `quantity` input, upsert behavior
- [ ] tRPC `assets.update` mutation with ownership validation
- [ ] tRPC `assets.delete` mutation with ownership validation
- [ ] `assets.list` returns enriched data: `valueIRT`, `assetName`, `assetIcon`, `change`, `totalIRT`, `stale`
- [ ] Price utilities: `parsePriceSnapshot`, `findBySymbol`, `groupByCategory`, `formatIRT`, `formatChange`
- [ ] Portfolio total banner with formatted IRT + staleness badge
- [ ] Asset list with icon, name, quantity, value, change %
- [ ] Add Asset page: searchable asset picker + quantity input
- [ ] Edit asset: inline quantity edit dialog
- [ ] Delete asset: confirmation dialog
- [ ] Empty state with CTA
- [ ] 30-minute auto-refresh polling
- [ ] My Assets page fully assembled as default route `/`
- [ ] Zod input validation with Persian error messages

---

## 6. Milestone 2.3 — Price List Page (قیمت‌ها)

**Goal:** Display all assets grouped by category with sell price and change percentage.

### Task 2.3.1 — Price List Page (~1d)

**New file: `src/app/(app)/prices/page.tsx`**

Client component that queries `prices.latest` and displays the data:

```typescript
export default function PricesPage() {
  const { data } = api.prices.latest.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const prices = parsePriceSnapshot(data?.data)
  const grouped = groupByCategory(prices)

  return (
    <div>
      <StalenessBadge snapshotAt={data?.snapshotAt} stale={data?.stale} />
      {[...grouped.entries()].map(([category, items]) => (
        <PriceSection key={category} category={category} items={items} />
      ))}
    </div>
  )
}
```

### Task 2.3.2 — Price Section & Row Components (~0.5d)

**New file: `src/components/price-section.tsx`**

Uses TelegramUI `Section` for category headers and `Cell` for price rows:

```typescript
<Section header={categoryLabels[category] ?? category}>
  {items.map((item) => (
    <PriceRow key={item.symbol} item={item} />
  ))}
</Section>
```

**New file: `src/components/price-row.tsx`**

Each row displays:
- Icon (from `item.png` or `item.base_currency.png`)
- Persian name (`item.name.fa` or `item.base_currency.fa`)
- Sell price in IRT with thousands separator
- Change % with color (green positive / red negative)

```typescript
<Cell
  before={<Avatar src={item.png ?? item.base_currency.png} size={40} />}
  after={
    <div className="flex flex-col items-end">
      <span className="font-medium">{formatIRT(Number(item.sell_price))} ت</span>
      {change && (
        <span className={change.positive ? 'text-green-600' : 'text-red-600'}>
          {change.text}
        </span>
      )}
    </div>
  }
>
  {item.base_currency.fa}
</Cell>
```

### Task 2.3.3 — Category Headers with Persian Labels (~0.25d)

Map `CategorySymbol` enum values to Persian display names (implemented in `src/lib/prices.ts` — Task 2.2.2).

Define the display order for categories:

```typescript
export const categoryOrder: string[] = [
  'CURRENCY',
  'CRYPTOCURRENCY',
  'GOLD',
  'COIN',
  'SILVER',
  'BORS',
  'GOLD_FUNDS',
  'STOCK_FUNDS',
  'FIXED_INCOME_FUNDS',
  'MIXED_ASSET_FUNDS',
  'LEVERAGED_FUNDS',
  'SECTOR_FUNDS',
  'PROPERTY_FUNDS',
  'COMMODITY_SAFFRON_FUNDS',
]
```

### Task 2.3.4 — Staleness Warning Badge (~0.25d)

Already implemented as `src/components/staleness-badge.tsx`. Place it at the top of the Price List page above the category sections.

Verify it works correctly with the `prices.latest` response shape.

### Milestone 2.3 Deliverables Checklist

- [ ] Price List page at `/prices`
- [ ] Assets grouped by category with Persian section headers
- [ ] Each row: icon, Persian name, sell price in IRT, change %
- [ ] Change % colored green (positive) / red (negative)
- [ ] Staleness badge at top when snapshot > 60 min old
- [ ] 30-minute auto-refresh polling
- [ ] Categories displayed in a logical order

---

## 7. Milestone 2.4 — Calculator Page (ماشین حساب)

**Goal:** Convert any asset to any other asset using live prices.

### Task 2.4.1 — Calculator Page (~1d)

**New file: `src/app/(app)/calculator/page.tsx`**

Client component with local state for `from`, `to`, and `amount`:

```typescript
export default function CalculatorPage() {
  const { data } = api.prices.latest.useQuery()
  const prices = parsePriceSnapshot(data?.data)

  const [fromSymbol, setFromSymbol] = useState<string>('USD')
  const [toSymbol, setToSymbol] = useState<string>('IRT')
  const [amount, setAmount] = useState<string>('')

  const fromPrice = findBySymbol(prices, fromSymbol)
  const toPrice = findBySymbol(prices, toSymbol)

  const result = computeConversion(amount, fromPrice, toPrice)

  return (
    <div className="flex flex-col gap-6 p-4">
      <AssetSelector label="از" value={fromSymbol} onChange={setFromSymbol} prices={prices} />
      <AmountInput value={amount} onChange={setAmount} />
      <SwapButton onSwap={() => { setFromSymbol(toSymbol); setToSymbol(fromSymbol) }} />
      <AssetSelector label="به" value={toSymbol} onChange={setToSymbol} prices={prices} />
      <ResultDisplay result={result} toSymbol={toSymbol} />
    </div>
  )
}
```

**Conversion formula** (from PRD):
```typescript
result = (amount × from_sell_price) / to_sell_price
```

Special case: IRT (Toman) does not appear as an asset in the Ecotrust price list — it's the quote currency for all items. When the user selects IRT as either From or To, treat its `sell_price` as `1`:

```typescript
const fromSell = fromSymbol === 'IRT' ? 1 : Number(fromPrice?.sell_price ?? 0)
const toSell = toSymbol === 'IRT' ? 1 : Number(toPrice?.sell_price ?? 0)
```

Add a synthetic IRT entry to the asset selector options so users can select it:
```typescript
const irtEntry = { symbol: 'IRT', name: { fa: 'تومان', en: 'Toman' }, sell_price: '1' }
```

### Task 2.4.2 — Asset Selector Component (~0.5d)

**New file: `src/components/asset-selector.tsx`**

A button that opens a searchable bottom sheet or full-page selector:

- Shows the currently selected asset (icon + Persian name + symbol)
- Tapping opens a searchable list (reuse the `AssetPicker` component from Task 2.2.5)
- Selecting an asset closes the picker and updates the selection

Consider using a TelegramUI `Modal` or `BottomSheet` for the picker overlay.

### Task 2.4.3 — Swap Button (~0.25d)

An icon button between the "from" and "to" selectors. Tapping it swaps `fromSymbol` and `toSymbol`.

```typescript
<IconButton onClick={onSwap}>
  <IconArrowsExchange size={24} />
</IconButton>
```

Animated rotation on swap (CSS `transition: transform 0.3s`).

### Task 2.4.4 — Result Display & Rounding (~0.25d)

**New file: `src/components/calculator-result.tsx`**

```typescript
function computeConversion(
  amount: string,
  fromPrice: PriceItem | undefined,
  toPrice: PriceItem | undefined,
): string | null {
  const qty = Number(amount)
  if (!qty || qty <= 0 || !fromPrice || !toPrice) return null

  const fromSell = Number(fromPrice.sell_price)
  const toSell = Number(toPrice.sell_price)
  if (toSell === 0) return null

  const result = (qty * fromSell) / toSell
  return result.toFixed(4) // Round to 4 decimal places per PRD
}
```

Display uses Persian number formatting with `Intl.NumberFormat('fa-IR')`.

### Milestone 2.4 Deliverables Checklist

- [ ] Calculator page at `/calculator`
- [ ] "From" and "To" asset selectors with searchable dropdowns
- [ ] Amount input with decimal support
- [ ] Real-time result display as user types
- [ ] Swap button exchanges From ↔ To
- [ ] Conversion formula: `(amount × from_sell_price) / to_sell_price`
- [ ] Result rounded to 4 decimal places
- [ ] Persian number formatting throughout

---

## 8. Shared Components & Utilities

### New shadcn Components to Add

Run these before starting implementation:

```bash
# For the asset edit/delete dialogs
pnpm dlx shadcn@latest add dialog

# For the asset selector and dropdowns
pnpm dlx shadcn@latest add input

# For the search input
pnpm dlx shadcn@latest add command

# For loading states
pnpm dlx shadcn@latest add skeleton
```

Evaluate after starting whether additional components are needed. Prefer TelegramUI equivalents where they exist.

### New Shared Components

| Component | File | Used By |
|---|---|---|
| `BottomNav` | `src/components/bottom-nav.tsx` | App layout |
| `PortfolioTotal` | `src/components/portfolio-total.tsx` | My Assets |
| `AssetListItem` | `src/components/asset-list-item.tsx` | My Assets |
| `AssetPicker` | `src/components/asset-picker.tsx` | Add Asset, Calculator |
| `AssetSelector` | `src/components/asset-selector.tsx` | Calculator |
| `EmptyState` | `src/components/empty-state.tsx` | My Assets |
| `PriceSection` | `src/components/price-section.tsx` | Prices |
| `PriceRow` | `src/components/price-row.tsx` | Prices |
| `CalculatorResult` | `src/components/calculator-result.tsx` | Calculator |
| `ChangeLabel` | `src/components/change-label.tsx` | Prices, Assets |

### New Utilities

| Utility | File | Purpose |
|---|---|---|
| Price parsing & formatting | `src/lib/prices.ts` | Shared by all pages |

### New Hooks

| Hook | File | Purpose |
|---|---|---|
| `useTelegramBackButton` | `src/hooks/use-telegram-back-button.ts` | Sub-page BackButton |

---

## 9. Dependency Graph & Task Order

```
Week 3                                          Week 4
───────────────────────────────────────────     ──────────────────────────────────────

[2.1.1] Route group ─┐
                      │
[2.1.2] Bottom nav ──┤
                      ├── [2.2.2] Price utils ── [2.2.1] Assets CRUD ─┐
[2.1.3] BackButton ──┤                                                 │
                      │                                                 ├── [2.2.3] Total banner
[2.1.5] Error bnd ───┘                                                 │
                                                                        ├── [2.2.4] Asset list UI
                                                                        │
                                                                        ├── [2.2.5] Add asset form
                                                                        │
                                                                        ├── [2.2.6] Edit/Delete
                                                                        │
                                                                        ├── [2.2.7] Empty state
                                                                        │
                                                                        ├── [2.2.8] Auto-refresh
                                                                        │
                                                                        └── [2.2.9] Assembly
                                                                               │
                              [2.3.1] Price page ─── [2.3.2] Section/Row ─────┤
                                                                               │
                              [2.3.3] Category hdrs ── [2.3.4] Staleness ─────┤
                                                                               │
                              [2.4.1] Calc page ─── [2.4.2] Asset selector ──┤
                                                                               │
                              [2.4.3] Swap btn ─── [2.4.4] Result display ───┘
```

### Recommended Execution Order

| Day | Tasks | Notes |
|---|---|---|
| **Day 1** | 2.1.1 (Route group) → 2.1.2 (Bottom nav) → 2.1.3 (BackButton) | App shell foundation |
| **Day 2** | 2.1.5 (Error boundary) + 2.2.2 (Price utils) | Parallel: UI + utilities |
| **Day 3** | 2.2.1 (Assets CRUD — tRPC procedures) | Core backend for My Assets |
| **Day 4** | 2.2.3 (Total banner) + 2.2.4 (Asset list UI) | My Assets UI components |
| **Day 5** | 2.2.5 (Add Asset form) | Largest single UI task |
| **Day 6** | 2.2.6 (Edit/Delete) + 2.2.7 (Empty state) + 2.2.8 (Auto-refresh) | My Assets completion |
| **Day 7** | 2.2.9 (Assembly) + manual testing of My Assets page | Integration |
| **Day 8** | 2.3.1 (Price page) + 2.3.2 (Section/Row) + 2.3.3 (Category hdrs) + 2.3.4 (Staleness) | Price List page (full) |
| **Day 9** | 2.4.1 (Calculator page) + 2.4.2 (Asset selector) | Calculator core |
| **Day 10** | 2.4.3 (Swap) + 2.4.4 (Result display) | Calculator completion |
| **Day 11** | Integration testing, bug fixes, polish | Buffer day |

### Parallelization Notes

- **My Assets CRUD (Day 3) and Price List (Day 8) are independent** — they share `src/lib/prices.ts` but don't block each other.
- **Calculator (Day 9–10) can start as soon as Price utilities exist (Day 2)** — it only depends on `prices.latest` and the price parsing functions.
- With 2 engineers, one can work on My Assets (Days 3–7) while the other builds Prices + Calculator (Days 3–6, starting after price utils).

---

## 10. Testing Strategy

### Unit Tests

| Test | What It Validates |
|---|---|
| `parsePriceSnapshot` | Handles null/undefined/malformed data, returns typed `PriceItem[]` |
| `findBySymbol` | Finds correct item, returns undefined for missing symbols |
| `groupByCategory` | Groups correctly, handles missing category field |
| `formatIRT` | Persian number formatting, thousands separators |
| `formatChange` | Positive/negative formatting, null handling |
| `computeConversion` | Correct formula, edge cases (zero, negative, undefined prices) |
| `assets.add` | Creates UserAsset, upserts on duplicate symbol |
| `assets.update` | Updates quantity, rejects other user's assets |
| `assets.delete` | Deletes asset, rejects other user's assets |

### Manual Testing

| Test | Steps |
|---|---|
| Add asset flow | Navigate to Add Asset → search "دلار" → select USD → enter 500 → save → see in list |
| Edit asset | Tap USD row → change to 1000 → save → verify updated value |
| Delete asset | Swipe/tap delete on USD → confirm → verify removed |
| Portfolio total | Add 3 assets → verify total = sum of individual values |
| Empty state | Delete all assets → verify empty state CTA shows |
| Price List | Navigate to Prices tab → verify grouped by category → check Persian names + prices |
| Calculator | Select USD → USDT → enter 100 → verify result → swap → verify reversed |
| Tab navigation | Tap each tab → verify correct page loads → verify active state |
| BackButton | Navigate to Add Asset → press Telegram BackButton → verify returns to My Assets |
| Auto-refresh | Wait for new snapshot → verify values update (or mock with shorter interval) |
| Error state | Disconnect network → verify error boundary shows Persian error |

### Automated Test Setup

Add new test files alongside implementation:

```
src/lib/__tests__/prices.test.ts       # Price utility tests
src/server/api/routers/__tests__/       # tRPC router tests
  assets.test.ts
```

---

## 11. Definition of Done

Phase 2 is complete when **all** of the following are true:

### Functionality

- [ ] Bottom tab bar navigates between 3 pages
- [ ] My Assets shows portfolio total in IRT at top
- [ ] User can add an asset by selecting from searchable list and entering quantity
- [ ] User can edit the quantity of an existing asset
- [ ] User can delete an asset with confirmation
- [ ] Each asset row shows icon, name, quantity, IRT value, and change %
- [ ] Empty state shows when no assets exist
- [ ] Price List shows all assets grouped by category
- [ ] Each price row shows icon, Persian name, sell price, and change %
- [ ] Calculator converts any asset to any other asset
- [ ] Swap button reverses From/To
- [ ] Result rounds to 4 decimal places

### Technical

- [ ] `pnpm build` succeeds
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (new tests for price utilities + asset CRUD)
- [ ] All tRPC procedures use Zod input validation
- [ ] No `any` types in new code
- [ ] 30-minute auto-refresh polling configured
- [ ] Telegram BackButton works on sub-pages

### UX

- [ ] All text is in Persian
- [ ] Layout is RTL
- [ ] Numbers formatted with Persian digits and thousands separators
- [ ] Staleness badge shows on stale prices
- [ ] Error boundary catches and displays errors in Persian
- [ ] Loading states shown during data fetches

---

## File Tree After Phase 2

```
src/
├── app/
│   ├── layout.tsx                        # Root layout (unchanged)
│   ├── login/page.tsx                    # Standalone login (unchanged)
│   ├── (app)/
│   │   ├── layout.tsx                    # NEW: App layout with bottom nav
│   │   ├── page.tsx                      # REPLACED: My Assets page
│   │   ├── error.tsx                     # NEW: Error boundary
│   │   ├── loading.tsx                   # NEW: Loading state
│   │   ├── prices/
│   │   │   └── page.tsx                  # NEW: Price List page
│   │   ├── calculator/
│   │   │   └── page.tsx                  # NEW: Calculator page
│   │   └── assets/
│   │       └── add/
│   │           └── page.tsx              # NEW: Add Asset page
│   └── api/                              # (unchanged)
├── server/
│   └── api/
│       └── routers/
│           ├── prices.ts                 # (unchanged)
│           └── assets.ts                 # MODIFIED: Full CRUD
├── components/
│   ├── bottom-nav.tsx                    # NEW
│   ├── portfolio-total.tsx               # NEW
│   ├── asset-list-item.tsx               # NEW
│   ├── asset-picker.tsx                  # NEW
│   ├── asset-selector.tsx                # NEW
│   ├── empty-state.tsx                   # NEW
│   ├── price-section.tsx                 # NEW
│   ├── price-row.tsx                     # NEW
│   ├── calculator-result.tsx             # NEW
│   ├── change-label.tsx                  # NEW
│   ├── staleness-badge.tsx               # (unchanged)
│   ├── telegram-provider.tsx             # (unchanged)
│   ├── theme-provider.tsx                # (unchanged)
│   └── ui/
│       ├── button.tsx                    # (unchanged)
│       ├── sonner.tsx                    # (unchanged)
│       ├── dialog.tsx                    # NEW (shadcn)
│       ├── input.tsx                     # NEW (shadcn)
│       └── skeleton.tsx                  # NEW (shadcn)
├── hooks/
│   └── use-telegram-back-button.ts       # NEW
├── lib/
│   └── prices.ts                         # NEW
└── types/
    └── telegram.d.ts                     # MODIFIED: BackButton types
```

---

## Appendix A: PRD ↔ Phase 2 Traceability

| PRD Requirement | Phase 2 Task | Status After Phase 2 |
|---|---|---|
| Three bottom tabs: دارایی‌ها / قیمت‌ها / ماشین حساب | 2.1.2 | ✅ |
| BackButton on sub-pages | 2.1.3 | ✅ |
| Add asset (select symbol + enter quantity) | 2.2.5 | ✅ |
| Edit asset quantity | 2.2.6 | ✅ |
| Delete asset | 2.2.6 | ✅ |
| Per-asset IRT value (quantity × sell_price) | 2.2.1, 2.2.4 | ✅ |
| Total portfolio value in IRT | 2.2.3 | ✅ |
| Auto-update when prices change | 2.2.8 | ✅ |
| Empty state with CTA | 2.2.7 | ✅ |
| Price list grouped by category | 2.3.1, 2.3.3 | ✅ |
| Icon, Persian name, sell price, change % per row | 2.3.2 | ✅ |
| Staleness badge on price list | 2.3.4 | ✅ |
| Calculator: From/To selector | 2.4.2 | ✅ |
| Calculator: amount input + real-time result | 2.4.1 | ✅ |
| Calculator: swap From ↔ To | 2.4.3 | ✅ |
| Calculator: result = (amount × from_sell) / to_sell, 4 decimals | 2.4.4 | ✅ |
| TelegramUI components for native feel | All UI tasks | ✅ |
| RTL layout with Persian text | Inherited from Phase 1 | ✅ |
| No PII stored | Inherited from Phase 1 | ✅ |

## Appendix B: Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| TelegramUI `Tabbar` component missing or broken in v2.1 | Medium | Medium | Fall back to custom Tailwind tab bar with `position: fixed; bottom: 0` |
| TelegramUI `Cell`/`Section` API differs from documentation | Low | Medium | Check actual exports before coding; fall back to custom components |
| `PriceSnapshot.data` JSON shape varies between Ecotrust responses | High | Low | `parsePriceSnapshot` validates structure; `findBySymbol` returns `undefined` safely |
| Large price list (~100+ items) causes slow render | Medium | Low | Virtualize with `react-window` or paginate by category; lazy load non-visible sections |
| Zod v4 API differences from v3 (cuid, refine) | Low | Medium | Check Zod v4 docs at implementation time; adjust schemas |
| BackButton not available outside Telegram | Low | Low | Hook already checks `window.Telegram?.WebApp`; browser users use browser back button |
| Decimal precision issues in JS | Medium | Medium | Use string quantities in tRPC input; compute on server with Prisma Decimal; format only on display |

## Appendix C: Deferred to Phase 3

These items are explicitly **not** in Phase 2 scope:

| Item | Why Phase 3 |
|---|---|
| Portfolio time-series chart | Requires `PortfolioSnapshot` data to accumulate over time |
| `Telegram.WebApp.MainButton` for Save/Convert | Polish item — standard buttons work for MVP |
| `Telegram.WebApp.HapticFeedback` | Polish item |
| `viewportStableHeight` listener | Polish item — keyboard avoidance |
| Price list search/filter | P1 nice-to-have; full list works for MVP |
| Pull-to-refresh | P1 nice-to-have; auto-refresh covers the use case |
| Loading skeletons | Basic spinner is sufficient for MVP; skeletons are polish |
| Per-asset value chart | P2 / post-v1 |
