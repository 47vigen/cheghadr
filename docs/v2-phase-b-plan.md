# v2 Phase B: Portfolio Intelligence — Implementation Plan

> **Cheghadr? (چه‌قدر؟)** — Personal Net Worth Tracker  
> Phase B makes the portfolio number emotionally meaningful: a category breakdown donut chart, multi-currency totals (USD/EUR), biggest mover highlight, and category drill-down.  
> Source: [PRD v2](https://www.notion.so/326ba087d94a81f2905fc1a84caabbd9) · [Roadmap v2](https://www.notion.so/326ba087d94a8116b2dbf00ddc6548e8)  
> Phase B ships as part of **v2.0** alongside Phase A (Engagement Loop).

---

## Table of Contents

1. [Phase A Recap & Starting State](#1-phase-a-recap--starting-state)
2. [Phase B Scope](#2-phase-b-scope)
3. [Architecture Decisions](#3-architecture-decisions)
4. [Milestone B.1 — Category Breakdown Chart (P0)](#4-milestone-b1--category-breakdown-chart-p0)
5. [Milestone B.2 — Multi-Currency Portfolio Total (P0)](#5-milestone-b2--multi-currency-portfolio-total-p0)
6. [Milestone B.3 — Category Drill-Down (P1)](#6-milestone-b3--category-drill-down-p1)
7. [Milestone B.4 — Biggest Mover Highlight (P1)](#7-milestone-b4--biggest-mover-highlight-p1)
8. [New tRPC Procedures](#8-new-trpc-procedures)
9. [New i18n Keys](#9-new-i18n-keys)
10. [Dependency Graph & Task Order](#10-dependency-graph--task-order)
11. [Updated My Assets Page Layout](#11-updated-my-assets-page-layout)
12. [Testing Strategy](#12-testing-strategy)
13. [Definition of Done](#13-definition-of-done)

---

## 1. Phase A Recap & Starting State

Phase A is complete. Here's what exists and is relevant to Phase B:

| Component | Current State | Phase B Needs |
|---|---|---|
| **Prisma schema** | `User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot`, `Alert` | No schema changes |
| **tRPC routers** | `prices` (public), `assets` (protected), `portfolio` (protected with `history` + `delta`), `alerts` (protected) | Add `portfolio.breakdown` procedure |
| **`assets.list`** | Returns `{ assets[], totalIRT, snapshotAt, stale }` — each asset has `valueIRT`, `change`, `sellPrice`, `symbol` | Add `category` field to each asset in the response |
| **`PortfolioSnapshot.breakdown`** | `[{ symbol, quantity, valueIRT }]` — stores per-asset data but **no category** | Category must be resolved at query time by cross-referencing `PriceSnapshot` |
| **`PriceSnapshot.data`** | Full Ecotrust API response; each `PriceItem` has `base_currency.category.symbol` | Source of category mapping for each symbol |
| **`groupByCategory()`** | Exists in `src/lib/prices.ts` — groups `PriceItem[]` by `base_currency.category.symbol` | Reuse pattern for portfolio breakdown grouping |
| **`formatIRT()`** | Formats numbers with `Intl.NumberFormat` — full precision, no compact notation | Need new `formatCompact()` for USD/EUR display (`$7,142` or `$142K`) |
| **Recharts** | `recharts@^3.8.0` installed; `PortfolioChart` uses `AreaChart` | Use `PieChart` for donut chart |
| **Category i18n** | `categories` namespace in `fa.json`/`en.json` with Persian/English labels for all categories | Already available — no new keys needed for category names |
| **Portfolio total** | `PortfolioTotal` component shows `totalIRT` in Toman | Add secondary USD/EUR row below |
| **Portfolio delta** | `PortfolioDelta` component shows `±X IRT (Y%)` with time window chips | No changes needed |
| **My Assets page** | Hero section (total + delta + staleness) → Chart → Alerts → Asset list → FAB | Insert breakdown chart + biggest mover between chart and alerts |

### Key v1+A patterns to follow

- **tRPC**: Zod input validation, `protectedProcedure` for auth, `publicProcedure` for prices
- **Prisma**: cuid IDs, `Decimal` for monetary values, `Json` for flexible data
- **UI**: HeroUI v3 (`Button`, `Modal`, `Text`), `Section` wrapper, `Cell` for list rows
- **Charts**: Recharts with `dir="ltr"` wrapper, CSS variable colors, custom tooltips
- **Numbers**: `formatIRT()` for Toman, `Intl.NumberFormat` for percentages
- **Colors**: `text-success` (green) / `text-destructive` (red) / `text-muted-foreground` (gray)
- **State**: `api.<router>.<procedure>.useQuery()`, `useUtils()` for invalidation
- **i18n**: `useTranslations()` hook, `fa.json` + `en.json`

---

## 2. Phase B Scope

**Theme:** "Make the number emotionally meaningful, not just accurate"

| Milestone | Priority | Effort | Scope |
|---|---|---|---|
| **B.1** Category Breakdown Chart | P0 Must | ~2 days | Donut chart, category grouping, tap-to-filter |
| **B.2** Multi-Currency Portfolio Total | P0 Must | ~1 day | USD/EUR totals below IRT banner |
| **B.3** Category Drill-Down | P1 Should | ~0.75 days | Filtered asset view with sub-totals |
| **B.4** Biggest Mover Highlight | P1 Should | ~0.75 days | Callout card for top-performing asset |

**P0 total: ~3 days** · P1 total: ~1.5 days · **Phase B total: ~4.5 days**

Phase B has **no schema changes** — all data needed already exists in `PortfolioSnapshot.breakdown` and `PriceSnapshot.data`. The work is entirely:
1. New tRPC procedure to reshape existing data
2. New UI components (donut chart, multi-currency row, biggest mover card)
3. Enhancements to existing components (`assets.list` enrichment, `PortfolioTotal` extension)

---

## 3. Architecture Decisions

### AD-1: Where to compute category breakdown

**Decision: New `portfolio.breakdown` tRPC procedure (server-side).**

The `PortfolioSnapshot.breakdown` JSON stores `[{ symbol, quantity, valueIRT }]` but does **not** include the category for each symbol. To build the donut chart, we need to cross-reference each symbol with the latest `PriceSnapshot` to resolve its category.

Options considered:
1. **Client-side**: `assets.list` already returns assets + price data → client groups by category
2. **Server-side**: New procedure that queries `PortfolioSnapshot` + `PriceSnapshot`, resolves categories, returns grouped data

Choosing server-side because:
- The category resolution logic (`PriceItem.base_currency.category.symbol`) should not leak to the client
- Reuses the existing `groupByCategory` pattern from `src/lib/prices.ts`
- The response is small and cacheable — no performance concern
- Keeps the donut chart component purely presentational

```typescript
// portfolio.breakdown returns:
type BreakdownCategory = {
  category: string     // "CURRENCY", "CRYPTOCURRENCY", "GOLD", "COIN", etc.
  valueIRT: number     // Sum of all asset values in this category
  percentage: number   // 0–100, relative to totalIRT
  assets: Array<{
    symbol: string
    quantity: number
    valueIRT: number
    percentage: number // % of total portfolio
  }>
}
```

### AD-2: Donut chart library choice

**Decision: Recharts `PieChart` with `innerRadius` (donut variant).**

Recharts is already installed and used for the portfolio area chart. Using Recharts for the donut chart means:
- Zero new dependencies
- Consistent chart styling (CSS variable colors, custom tooltips, `dir="ltr"` wrapper)
- Team familiarity with the API

The donut chart will use fixed, theme-aware category colors (not random). Each category gets a semantic color from a predefined palette.

### AD-3: Multi-currency total computation location

**Decision: Client-side computation in `PortfolioTotal` component.**

Both `totalIRT` (from `assets.list`) and USD/EUR sell prices (from `prices.latest`) are already fetched by the My Assets page. Computing `totalUSD = totalIRT / USD_sell_price` client-side avoids an extra server round-trip.

The `PortfolioTotal` component will accept optional `usdSellPrice` and `eurSellPrice` props from the parent page, which extracts them from the already-fetched price data.

### AD-4: Compact number formatting for USD/EUR

**Decision: New `formatCompactCurrency()` utility in `src/lib/prices.ts`.**

The PRD specifies compact notation for foreign currency (e.g., `$142K` not `$142,000`). This needs a new formatting function:

```typescript
function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
  locale: string,
): string
```

Uses `Intl.NumberFormat` with `notation: 'compact'` and appropriate currency symbols. For values < 1000, show full precision (`$742`). For larger values, use compact notation (`$7.1K`, `$142K`, `$1.4M`).

### AD-5: Category-to-color mapping

**Decision: Static color map defined in a shared constant.**

Each asset category gets a fixed, theme-aware color for the donut chart and drill-down headers. Colors are defined as CSS custom properties so they respect light/dark mode.

```typescript
const CATEGORY_COLORS: Record<string, string> = {
  CURRENCY:       'oklch(0.65 0.18 250)',   // blue
  CRYPTOCURRENCY: 'oklch(0.65 0.18 310)',   // purple
  GOLD:           'oklch(0.75 0.16 85)',     // gold/amber
  COIN:           'oklch(0.70 0.14 55)',     // warm orange
  SILVER:         'oklch(0.70 0.02 0)',      // silver/gray
  OTHER:          'oklch(0.60 0.06 0)',      // neutral gray
}
```

Categories not in this map fall back to `OTHER` color. The full 15-category Ecotrust list doesn't need individual colors — users are unlikely to hold assets in all fund categories. The top 5 (CURRENCY, CRYPTOCURRENCY, GOLD, COIN, SILVER) get distinct colors; the rest share neutral tones.

### AD-6: Biggest mover computation

**Decision: Client-side computation from existing `assets.list` data.**

The `assets.list` response already includes both `valueIRT` (current value) and `change` (24h price change percentage) for each asset. The biggest mover by absolute IRT impact can be derived client-side:

```
previousValueIRT = valueIRT / (1 + change/100)
deltaIRT = valueIRT - previousValueIRT
```

The asset with the highest `Math.abs(deltaIRT)` is the biggest mover. This avoids any new server round-trip or additional PriceSnapshot queries.

### AD-7: Category filtering state management

**Decision: Local state in the My Assets page component using `useState`.**

When a user taps a donut segment (B.1) or the drill-down view (B.3), the asset list filters to show only that category. This is managed via a `selectedCategory: string | null` state in `page.tsx`:

- `null` → show all assets (default)
- `"GOLD"` → show only gold assets
- Tapping the same segment again (or a "show all" button) resets to `null`

The filtering happens on the client over the already-fetched `assets.list` data — no additional server query needed.

---

## 4. Milestone B.1 — Category Breakdown Chart (P0)

**Goal:** Donut chart on My Assets showing portfolio allocation by asset category.  
**Depends on:** `PortfolioSnapshot.breakdown` data (available from v1).

### Task B.1.1 — `portfolio.breakdown` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

New procedure on the existing `portfolioRouter`:

```typescript
breakdown: protectedProcedure.query(async ({ ctx }) => {
  const [latestSnap, priceSnapshot] = await Promise.all([
    ctx.db.portfolioSnapshot.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { snapshotAt: 'desc' },
      select: { totalIRT: true, breakdown: true },
    }),
    ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    }),
  ])

  if (!latestSnap || !priceSnapshot) return null

  const prices = parsePriceSnapshot(priceSnapshot.data)
  const totalIRT = Number(latestSnap.totalIRT)
  if (totalIRT === 0) return null

  type BreakdownItem = { symbol: string; quantity: number; valueIRT: number }
  const items = latestSnap.breakdown as BreakdownItem[]

  // Resolve category for each symbol and group
  const categoryMap = new Map<string, {
    valueIRT: number
    assets: Array<{ symbol: string; quantity: number; valueIRT: number }>
  }>()

  for (const item of items) {
    const priceItem = findBySymbol(prices, item.symbol)
    const category = priceItem?.base_currency.category?.symbol ?? 'OTHER'
    const existing = categoryMap.get(category) ?? { valueIRT: 0, assets: [] }
    existing.valueIRT += item.valueIRT
    existing.assets.push(item)
    categoryMap.set(category, existing)
  }

  // Sort by categoryOrder (reuse from prices.ts) and compute percentages
  const result = []
  for (const cat of categoryOrder) {
    const data = categoryMap.get(cat)
    if (!data) continue
    result.push({
      category: cat,
      valueIRT: data.valueIRT,
      percentage: (data.valueIRT / totalIRT) * 100,
      assets: data.assets.map((a) => ({
        ...a,
        percentage: (a.valueIRT / totalIRT) * 100,
      })),
    })
  }
  // Include any categories not in categoryOrder
  for (const [cat, data] of categoryMap) {
    if (!categoryOrder.includes(cat)) {
      result.push({
        category: cat,
        valueIRT: data.valueIRT,
        percentage: (data.valueIRT / totalIRT) * 100,
        assets: data.assets.map((a) => ({
          ...a,
          percentage: (a.valueIRT / totalIRT) * 100,
        })),
      })
    }
  }

  return { totalIRT, categories: result }
})
```

**Key design decisions:**
- Returns both the aggregated category data (for the donut chart) and per-asset data within each category (for B.3 drill-down)
- Uses `categoryOrder` from `src/lib/prices.ts` to ensure consistent display order
- Falls back to `'OTHER'` for symbols whose category can't be resolved (e.g., PriceSnapshot is stale)
- Returns `null` if no snapshot exists or totalIRT is zero

### Task B.1.2 — Category color constants

**File:** `src/lib/category-colors.ts` (new)

```typescript
export const CATEGORY_COLORS: Record<string, string> = {
  CURRENCY:       'oklch(0.65 0.18 250)',
  CRYPTOCURRENCY: 'oklch(0.65 0.18 310)',
  GOLD:           'oklch(0.75 0.16 85)',
  COIN:           'oklch(0.70 0.14 55)',
  SILVER:         'oklch(0.70 0.02 0)',
  BORS:           'oklch(0.60 0.12 180)',
  GOLD_FUNDS:     'oklch(0.72 0.12 80)',
  STOCK_FUNDS:    'oklch(0.58 0.14 200)',
  OTHER:          'oklch(0.60 0.06 0)',
}

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.OTHER
}
```

Small module — a few lines, no logic complexity. Kept separate to make theme changes easy and to share between the donut chart and any future category-colored UI.

### Task B.1.3 — `PortfolioBreakdown` donut chart component

**File:** `src/components/portfolio-breakdown.tsx` (new)

A donut chart using Recharts' `PieChart`:

```
┌──────────────────────────────┐
│          Donut Chart         │
│     ┌───────────────┐       │
│     │   Total IRT   │       │
│     │   in center   │       │
│     └───────────────┘       │
│                              │
│  Legend below chart:         │
│  ● ارز    ۴۰%   ● طلا  ۳۰% │
│  ● رمزارز ۲۰%   ● سکه  ۱۰% │
└──────────────────────────────┘
```

Implementation details:
- Uses `PieChart`, `Pie`, `Cell`, `ResponsiveContainer` from recharts
- `innerRadius={60}`, `outerRadius={90}` for donut shape (adjust for mobile)
- Center label shows total IRT (using Recharts `customLabel` or absolutely positioned overlay)
- Each `Cell` colored via `getCategoryColor(category)`
- Legend rendered as a custom component below the chart (not Recharts' built-in legend) — more control over RTL layout
- Category labels from i18n: `t(\`categories.${category}\`)`
- Wrapped in `dir="ltr"` to keep chart rendering correct in RTL layout
- Custom tooltip on hover/tap: shows category name (Persian), percentage, and IRT value

**Props:**
```typescript
interface PortfolioBreakdownProps {
  data: {
    category: string
    valueIRT: number
    percentage: number
  }[]
  totalIRT: number
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}
```

**Tap interaction:**
- `onClick` handler on each `Pie` cell sets `selectedCategory` via callback
- Tapping an already-selected segment deselects (sets to `null`)
- Selected segment gets a slight scale-up via `outerRadius` increase or stroke highlight
- Haptic feedback via `useTelegramHaptics().selectionChanged()`

### Task B.1.4 — Integrate breakdown chart into My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

Add `portfolio.breakdown` query and the `PortfolioBreakdown` component:

```typescript
// New query
const breakdownQuery = api.portfolio.breakdown.useQuery(undefined, {
  refetchInterval: 30 * 60 * 1000,
})

// New state
const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

// Filter assets when a category is selected
const displayedAssets = selectedCategory
  ? data.assets.filter((a) => getAssetCategory(a.symbol, priceItems) === selectedCategory)
  : data.assets
```

Insert the chart as a new `Section` between the portfolio chart and the alerts section:

```tsx
{breakdownQuery.data && (
  <div>
    <Section header={t('breakdown.title')}>
      <PortfolioBreakdown
        data={breakdownQuery.data.categories}
        totalIRT={breakdownQuery.data.totalIRT}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
    </Section>
  </div>
)}
```

The asset list section uses `displayedAssets` instead of `data.assets`, with a "show all" chip when a filter is active.

### Task B.1.5 — Enrich `assets.list` with category field

**File:** `src/server/api/routers/assets.ts` (modified)

Add `category` to the asset response so the client can filter by category without a separate lookup:

```typescript
const assets = userAssets.map((asset) => {
  const priceItem = findBySymbol(prices, asset.symbol)
  const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
  const qty = Number(asset.quantity)
  return {
    ...asset,
    valueIRT: qty * sellPrice,
    assetName: priceItem?.name.fa ?? asset.symbol,
    assetNameEn: priceItem?.name.en ?? asset.symbol,
    assetIcon: priceItem?.png ?? priceItem?.base_currency.png ?? null,
    change: priceItem?.change ?? null,
    sellPrice,
    category: priceItem?.base_currency.category?.symbol ?? 'OTHER', // NEW
  }
})
```

This allows the asset list filtering (B.1.4) to work without a separate category resolution step on the client.

### Task B.1.6 — Edge cases

- **1 asset (100% one category):** Donut renders as a full circle with a single color. Legend shows one entry at 100%.
- **10+ assets across all categories:** Donut renders all segments. Small segments (< 3%) get a minimum visual size to remain tappable. Legend wraps to multiple rows.
- **No portfolio snapshot:** Component renders nothing (same pattern as `PortfolioDelta`).
- **Empty portfolio (0 assets):** Not reached — the breakdown section is only rendered when `breakdownQuery.data` is truthy and the portfolio is non-empty.
- **Category resolution failure (symbol not in PriceSnapshot):** Falls back to `'OTHER'` category — never crashes.

### Task B.1.7 — Category filter indicator + "show all" control

**File:** `src/app/(app)/page.tsx` (modified)

When `selectedCategory` is not null, show a filter indicator above the asset list:

```tsx
{selectedCategory && (
  <div className="flex items-center justify-between px-2 py-1">
    <Text className="text-sm text-muted-foreground">
      {t('breakdown.filterActive', { category: t(`categories.${selectedCategory}`) })}
    </Text>
    <Button
      size="sm"
      variant="ghost"
      onPress={() => setSelectedCategory(null)}
    >
      {t('breakdown.showAll')}
    </Button>
  </div>
)}
```

---

## 5. Milestone B.2 — Multi-Currency Portfolio Total (P0)

**Goal:** Show approximate USD and EUR equivalents below the IRT total.  
**Independent of B.1** — can be developed in parallel.

### Task B.2.1 — `formatCompactCurrency()` utility

**File:** `src/lib/prices.ts` (modified — add new export)

```typescript
export function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
  locale = 'fa',
): string {
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US'
  const symbol = currency === 'USD' ? '$' : '€'

  if (value < 1000) {
    const formatted = new Intl.NumberFormat(intlLocale, {
      maximumFractionDigits: 0,
    }).format(Math.round(value))
    return `≈ ${symbol}${formatted}`
  }

  const formatted = new Intl.NumberFormat(intlLocale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

  return `≈ ${symbol}${formatted}`
}
```

The `≈` prefix is explicit in the PRD — it signals that these are estimates based on sell price conversion.

**Note on locale:** In Persian locale (`fa-IR`), `Intl.NumberFormat` with `notation: 'compact'` may produce Persian compact suffixes (هزار for thousand, etc.). We should test this and decide whether to force `en-US` for the compact currency display to keep the `$7.1K` format internationally recognizable. The recommendation is to use `en-US` formatting for USD/EUR display regardless of locale, since these are foreign currency values and the `$` / `€` symbols are LTR.

**Revised approach:**

```typescript
export function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
): string {
  const symbol = currency === 'USD' ? '$' : '€'

  // Always use en-US for foreign currency compact notation
  if (value < 1000) {
    return `≈ ${symbol}${Math.round(value).toLocaleString('en-US')}`
  }

  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

  return `≈ ${symbol}${formatted}`
}
```

### Task B.2.2 — Extract USD/EUR sell prices in My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

The page already has access to the full price list via `assets.list`. However, `assets.list` doesn't return the raw price items — only the user's asset data enriched with prices. We need the USD and EUR sell prices.

**Option A:** Fetch `prices.latest` in the My Assets page (it's already fetched on the Prices tab; React Query may serve it from cache).

**Option B:** Extend `assets.list` to return `usdSellPrice` and `eurSellPrice` as top-level fields.

**Decision: Option B** — avoids an extra query and keeps the data co-located with `totalIRT`.

**File:** `src/server/api/routers/assets.ts` (modified)

```typescript
const usdSellPrice = getSellPriceBySymbol('USD', prices)
const eurSellPrice = getSellPriceBySymbol('EUR', prices)

return {
  assets,
  totalIRT,
  snapshotAt: snapshot?.snapshotAt ?? null,
  stale,
  usdSellPrice: usdSellPrice > 0 ? usdSellPrice : null,  // NEW
  eurSellPrice: eurSellPrice > 0 ? eurSellPrice : null,  // NEW
}
```

Returning `null` when the price is 0 or missing signals "data unavailable" — the UI hides the row.

### Task B.2.3 — Extend `PortfolioTotal` with multi-currency row

**File:** `src/components/portfolio-total.tsx` (modified)

Add optional USD/EUR props and a secondary display row:

```typescript
interface PortfolioTotalProps {
  totalIRT: number
  usdSellPrice?: number | null
  eurSellPrice?: number | null
}
```

Below the existing IRT total, add:

```tsx
<div className="flex items-baseline gap-3 ps-1" dir="ltr">
  {usdSellPrice != null && usdSellPrice > 0 && (
    <Text className="font-display text-sm text-muted-foreground tabular-nums">
      {formatCompactCurrency(totalIRT / usdSellPrice, 'USD')}
    </Text>
  )}
  {eurSellPrice != null && eurSellPrice > 0 && (
    <Text className="font-display text-sm text-muted-foreground tabular-nums">
      {formatCompactCurrency(totalIRT / eurSellPrice, 'EUR')}
    </Text>
  )}
</div>
```

**Design details:**
- Uses `dir="ltr"` to keep `$` / `€` symbols on the left
- `text-muted-foreground` for secondary emphasis (these are approximate, not the main number)
- `font-display` + `tabular-nums` for consistent number alignment
- `text-sm` — smaller than the main IRT total
- If only USD is available (no EUR in latest snapshot), show only USD. If neither is available, render nothing.

### Task B.2.4 — Pass USD/EUR prices from page to component

**File:** `src/app/(app)/page.tsx` (modified)

```tsx
<PortfolioTotal
  totalIRT={data.totalIRT}
  usdSellPrice={data.usdSellPrice}
  eurSellPrice={data.eurSellPrice}
/>
```

### Task B.2.5 — Handle missing EUR data gracefully

**Acceptance criterion:** "Given EUR data is missing from the latest snapshot, when the banner renders, then the EUR total is hidden (not shown as zero or error)."

This is handled by the null-check in B.2.3 — `eurSellPrice != null && eurSellPrice > 0`. The `assets.list` procedure returns `null` when `getSellPriceBySymbol('EUR', prices)` returns 0 (meaning EUR is not in the Ecotrust response). The component simply doesn't render the EUR line.

### Task B.2.6 — Unit test for `formatCompactCurrency`

**File:** `src/lib/__tests__/format-compact-currency.test.ts` (new)

Test cases:
- `formatCompactCurrency(742, 'USD')` → `'≈ $742'`
- `formatCompactCurrency(7142, 'USD')` → `'≈ $7.1K'`
- `formatCompactCurrency(142000, 'USD')` → `'≈ $142K'`
- `formatCompactCurrency(1420000, 'EUR')` → `'≈ €1.4M'`
- `formatCompactCurrency(0, 'USD')` → `'≈ $0'`
- `formatCompactCurrency(999, 'EUR')` → `'≈ €999'`
- `formatCompactCurrency(1000, 'USD')` → `'≈ $1K'`

---

## 6. Milestone B.3 — Category Drill-Down (P1)

**Goal:** Tapping a donut segment shows a filtered view with per-asset detail and sub-totals.  
**Depends on:** B.1 (category breakdown chart + filtering state).

### Task B.3.1 — Category filter header with sub-total

**File:** `src/components/category-filter-header.tsx` (new)

When `selectedCategory` is active, replace the default "لیست دارایی‌ها" section header with a richer header showing:

```
┌──────────────────────────────────────┐
│ طلا (Gold)           ۳۰% از سبد      │
│ ۳,۰۰۰,۰۰۰,۰۰۰ تومان               │
│                   [نمایش همه ←]      │
└──────────────────────────────────────┘
```

Props:
```typescript
interface CategoryFilterHeaderProps {
  category: string
  valueIRT: number
  percentage: number
  onClear: () => void
}
```

- Category name from i18n `t(\`categories.${category}\`)`
- Percentage badge using the category color from `getCategoryColor()`
- Sub-total formatted with `formatIRT()`
- "نمایش همه" (Show All) button to clear the filter

### Task B.3.2 — "% of portfolio" label on asset rows in drill-down

**File:** `src/components/asset-list-item.tsx` (modified)

Add an optional `portfolioPercentage` prop:

```typescript
interface AssetListItemProps {
  // ... existing props
  portfolioPercentage?: number | null  // NEW — shown only in drill-down
}
```

When `portfolioPercentage` is provided, show it as a subtle badge below the value:

```tsx
{portfolioPercentage != null && (
  <Text className="text-xs text-muted-foreground tabular-nums">
    {new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
      maximumFractionDigits: 1,
    }).format(portfolioPercentage)}% {t('ofPortfolio')}
  </Text>
)}
```

### Task B.3.3 — Wire drill-down into My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

When `selectedCategory` is active:

1. Filter `data.assets` by the enriched `category` field (from B.1.5)
2. Compute `portfolioPercentage` for each filtered asset: `(asset.valueIRT / data.totalIRT) * 100`
3. Replace the default section header with `CategoryFilterHeader`
4. Pass `portfolioPercentage` to each `AssetListItem`

```tsx
const filteredAssets = selectedCategory
  ? data.assets.filter((a) => a.category === selectedCategory)
  : data.assets

// In the asset list section:
<Section
  header={
    selectedCategory && breakdownQuery.data
      ? <CategoryFilterHeader
          category={selectedCategory}
          valueIRT={breakdownQuery.data.categories.find(c => c.category === selectedCategory)?.valueIRT ?? 0}
          percentage={breakdownQuery.data.categories.find(c => c.category === selectedCategory)?.percentage ?? 0}
          onClear={() => setSelectedCategory(null)}
        />
      : t('assetsList')
  }
>
  {filteredAssets.map((asset) => (
    <AssetListItem
      key={asset.id}
      {...asset}
      portfolioPercentage={
        selectedCategory && data.totalIRT > 0
          ? (asset.valueIRT / data.totalIRT) * 100
          : undefined
      }
    />
  ))}
</Section>
```

---

## 7. Milestone B.4 — Biggest Mover Highlight (P1)

**Goal:** Surface a callout card showing the user's asset with the highest absolute IRT value change in the last 24 hours.  
**Independent of B.1/B.3** — can be developed in parallel.

### Task B.4.1 — `computeBiggestMover()` utility

**File:** `src/lib/portfolio-utils.ts` (new)

```typescript
interface AssetWithChange {
  symbol: string
  assetName: string
  valueIRT: number
  change: string | null
}

interface BiggestMover {
  symbol: string
  assetName: string
  deltaIRT: number
  changePct: number
  isPositive: boolean
}

export function computeBiggestMover(
  assets: AssetWithChange[],
): BiggestMover | null {
  let biggest: BiggestMover | null = null
  let maxAbsDelta = 0

  for (const asset of assets) {
    if (!asset.change) continue
    const changePct = Number(asset.change)
    if (Number.isNaN(changePct) || changePct === 0) continue

    // deltaIRT = valueIRT - (valueIRT / (1 + change/100))
    const previousValue = asset.valueIRT / (1 + changePct / 100)
    const deltaIRT = asset.valueIRT - previousValue
    const absDelta = Math.abs(deltaIRT)

    if (absDelta > maxAbsDelta) {
      maxAbsDelta = absDelta
      biggest = {
        symbol: asset.symbol,
        assetName: asset.assetName,
        deltaIRT,
        changePct,
        isPositive: deltaIRT > 0,
      }
    }
  }

  return biggest
}
```

### Task B.4.2 — `BiggestMoverCard` component

**File:** `src/components/biggest-mover-card.tsx` (new)

A compact callout card:

```
┌──────────────────────────────────────┐
│ 📈 طلا ۱۸ عیار  +۳۲۰,۰۰۰ ت (+۲.۱%)│
│                             امروز   │
└──────────────────────────────────────┘
```

Props:
```typescript
interface BiggestMoverCardProps {
  assetName: string
  deltaIRT: number
  changePct: number
  isPositive: boolean
}
```

Implementation:
- Uses the `Cell` component pattern (but without before/after — just a single-line callout)
- Or a custom `div` with accent styling
- Emoji: `📈` for positive, `📉` for negative
- Delta formatted with `formatIRT()`, change with `Intl.NumberFormat`
- Color: `text-success` / `text-destructive`
- Subtle background: `bg-success/10` / `bg-destructive/10`
- Label: "امروز" (today) as a trailing badge

### Task B.4.3 — Integrate into My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

Compute the biggest mover from the already-fetched `data.assets`:

```tsx
const biggestMover = useMemo(
  () => computeBiggestMover(data.assets),
  [data.assets],
)
```

Render below the breakdown chart (or above the asset list):

```tsx
{biggestMover && (
  <div>
    <Section header={t('breakdown.biggestMover')}>
      <BiggestMoverCard {...biggestMover} />
    </Section>
  </div>
)}
```

Only shown when:
- User has at least 1 asset with a non-zero change
- `deltaIRT` is non-trivial (consider a minimum threshold, e.g., > 1000 IRT, to avoid noise)

### Task B.4.4 — Unit test for `computeBiggestMover`

**File:** `src/lib/__tests__/portfolio-utils.test.ts` (new)

Test cases:
- Single asset with positive change → returns that asset
- Multiple assets → returns the one with highest absolute deltaIRT
- Asset with negative change has higher absolute impact → returns negative mover
- All assets have zero change → returns null
- Asset with null change → skipped
- Empty array → returns null
- Asset with very small change → correctly computed

---

## 8. New tRPC Procedures

| Router | Procedure | Type | Auth | Input | Output |
|---|---|---|---|---|---|
| `portfolio` | `breakdown` | query | protected | — | `{ totalIRT, categories: BreakdownCategory[] } \| null` |

**Modified procedures:**

| Router | Procedure | Change |
|---|---|---|
| `assets` | `list` | Add `category` field to each asset; add `usdSellPrice`, `eurSellPrice` to top-level response |

No new routers are created. Phase B adds one procedure and modifies one existing procedure.

---

## 9. New i18n Keys

### `fa.json` additions

```json
{
  "breakdown": {
    "title": "ترکیب سبد",
    "biggestMover": "بیشترین تغییر",
    "filterActive": "فیلتر: {category}",
    "showAll": "نمایش همه",
    "ofPortfolio": "از سبد",
    "today": "امروز",
    "noData": "برای مشاهده ترکیب سبد، حداقل یک دارایی اضافه کنید"
  }
}
```

### `en.json` additions

```json
{
  "breakdown": {
    "title": "Portfolio Breakdown",
    "biggestMover": "Biggest Mover",
    "filterActive": "Filter: {category}",
    "showAll": "Show All",
    "ofPortfolio": "of portfolio",
    "today": "today",
    "noData": "Add at least one asset to see your portfolio breakdown"
  }
}
```

---

## 10. Dependency Graph & Task Order

```
B.1.1 portfolio.breakdown tRPC        B.2.1 formatCompactCurrency utility
  ↓                                       ↓
B.1.2 Category color constants         B.2.2 Extend assets.list with USD/EUR prices
  ↓                                       ↓
B.1.3 PortfolioBreakdown chart         B.2.3 Extend PortfolioTotal component
  ↓                                       ↓
B.1.4 Integrate chart into page        B.2.4 Wire props in page.tsx
  ↓                                       ↓
B.1.5 Enrich assets.list + category    B.2.5 Handle missing EUR
  ↓                                       ↓
B.1.6 Edge cases                       B.2.6 Unit test formatCompactCurrency
  ↓
B.1.7 Filter indicator + show all
  ↓
B.3.1 CategoryFilterHeader ←──── depends on B.1
  ↓
B.3.2 % of portfolio on AssetListItem
  ↓
B.3.3 Wire drill-down into page
                                       B.4.1 computeBiggestMover utility
                                         ↓
                                       B.4.2 BiggestMoverCard component
                                         ↓
                                       B.4.3 Integrate into page
                                         ↓
                                       B.4.4 Unit test computeBiggestMover
```

**Parallelism opportunities:**
- **B.1** and **B.2** are fully independent — can be developed in parallel
- **B.4** is independent of B.1/B.2/B.3 — can be developed in parallel
- **B.3** depends on B.1 (it extends the tap-to-filter interaction)

### Suggested implementation order

1. **B.1.1–B.1.2** (tRPC procedure + color constants) — foundation
2. **B.2.1–B.2.2** (formatCompact + assets.list enrichment) — can start in parallel with B.1
3. **B.1.3–B.1.5** (donut chart component + page integration + assets.list category)
4. **B.2.3–B.2.5** (PortfolioTotal extension + wiring)
5. **B.1.6–B.1.7** (edge cases + filter indicator)
6. **B.4.1–B.4.3** (biggest mover — fully independent, slot in anywhere)
7. **B.3.1–B.3.3** (drill-down — depends on B.1 being complete)
8. **B.2.6 + B.4.4** (unit tests — can be written alongside or after implementation)

---

## 11. Updated My Assets Page Layout

After Phase B, the My Assets page layout becomes:

```
AssetsPage
├── Section (hero) — Portfolio Total (IRT + USD/EUR) + Delta Banner + Staleness  [B.2]
├── Section — Portfolio Chart (area chart, 30-day history)
├── Section — "ترکیب سبد" — Portfolio Breakdown (donut chart)                     [B.1]
├── Section — "بیشترین تغییر" — Biggest Mover Highlight                          [B.4]
├── Section — "هشدارها" — Alerts Summary Card
├── Section — "لیست دارایی‌ها" — Asset List (filterable by category)              [B.1/B.3]
│   ├── (if category filter active) → CategoryFilterHeader with sub-total        [B.3]
│   └── AssetListItem[] (with optional % of portfolio in drill-down)             [B.3]
└── FAB — Add Asset
```

**Empty state logic:**
- Breakdown chart and biggest mover only render when `data.assets.length > 0`
- If user has assets but no `PortfolioSnapshot` yet (just added first asset, cron hasn't run), the breakdown returns null → section is hidden
- The "no data" placeholder for breakdown is only shown if the user has assets but breakdown data is null (shouldn't happen in practice since `createPortfolioSnapshot` fires on asset add)

---

## 12. Testing Strategy

### Unit tests (Vitest)

| Module | Test file | Key test cases |
|---|---|---|
| `formatCompactCurrency` | `format-compact-currency.test.ts` | Various value ranges, USD/EUR, edge cases (0, 999, 1000) |
| `computeBiggestMover` | `portfolio-utils.test.ts` | Single/multiple assets, positive/negative, null change, empty array |
| `getCategoryColor` | `category-colors.test.ts` | Known categories, unknown category fallback |

### Integration testing

- **`portfolio.breakdown` procedure:** Seed test DB with user, assets, and snapshot data; verify grouped output matches expected categories and percentages
- **`assets.list` enrichment:** Verify new `category`, `usdSellPrice`, `eurSellPrice` fields are present and correct

### Manual testing

1. **Donut chart rendering:** Add assets in 3+ categories → verify chart shows correct segments with correct proportions
2. **Single-category edge case:** Add only USD assets → verify chart shows a full circle
3. **Tap interaction:** Tap a donut segment → verify asset list filters correctly; tap again → filter clears
4. **Multi-currency totals:** View portfolio total → verify `≈ $X USD` and `≈ €X EUR` appear below IRT
5. **Missing EUR:** If EUR is not in price data → verify EUR line is hidden, not shown as error
6. **Biggest mover:** Add assets with varying changes → verify the correct asset appears in the highlight card
7. **RTL layout:** Verify all new components render correctly in RTL (Persian) mode
8. **Dark mode:** Verify donut chart colors, text colors, and card backgrounds look correct in dark mode
9. **Category drill-down (B.3):** Tap a segment → verify filtered view shows sub-total header and % of portfolio per asset

### Commands

```bash
pnpm test                    # Run all unit tests
pnpm typecheck               # TypeScript validation
pnpm lint                    # Biome lint
pnpm check                   # typecheck + lint
```

---

## 13. Definition of Done

### B.1 — Category Breakdown Chart ✅

- [ ] `portfolio.breakdown` tRPC procedure returns category-grouped data from PortfolioSnapshot
- [ ] Donut chart renders with correct segments for each category present in the portfolio
- [ ] Each segment is colored with a distinct, theme-aware color
- [ ] Category labels are shown in Persian (via i18n)
- [ ] Tapping a segment filters the asset list to that category
- [ ] Tapping the same segment again clears the filter
- [ ] Chart renders correctly with 1 asset (single full segment)
- [ ] Chart renders correctly with 10+ assets across all categories
- [ ] Chart is hidden when no portfolio snapshot exists
- [ ] A filter indicator with "show all" appears when a category is selected

### B.2 — Multi-Currency Portfolio Total ✅

- [ ] `≈ $X USD` and `≈ €X EUR` appear below the IRT total
- [ ] Uses compact notation for large values (`$7.1K`, `$142K`)
- [ ] EUR line is hidden (not zero, not error) when EUR price is missing
- [ ] Both lines hidden when no price data is available
- [ ] Values are computed as `totalIRT / sell_price`
- [ ] Displays with `dir="ltr"` for correct currency symbol placement
- [ ] Unit tests pass for `formatCompactCurrency`

### B.3 — Category Drill-Down (P1) ✅

- [ ] Tapping a donut segment shows a filtered view with only that category's assets
- [ ] Filtered view shows a sub-total for the category
- [ ] Each asset in the filtered view shows "X% of portfolio" label
- [ ] A "show all" button clears the filter and returns to the full asset list
- [ ] Category filter header shows category name, percentage, and sub-total

### B.4 — Biggest Mover Highlight (P1) ✅

- [ ] A callout card shows the asset with the highest absolute IRT change in 24h
- [ ] Card shows: emoji (📈/📉), asset name, delta IRT, change percentage, "today" label
- [ ] Green styling for positive, red for negative
- [ ] Card is hidden when no asset has a non-zero change
- [ ] Unit tests pass for `computeBiggestMover`

### Cross-cutting ✅

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No console errors in development
- [ ] All new i18n keys added to both `fa.json` and `en.json`
- [ ] Donut chart renders correctly in RTL layout
- [ ] All components respect light/dark mode
- [ ] Conventional commits used throughout

---

## File Change Summary

### New files

| File | Purpose |
|---|---|
| `src/lib/category-colors.ts` | Category-to-color mapping for donut chart |
| `src/lib/portfolio-utils.ts` | `computeBiggestMover()` utility |
| `src/components/portfolio-breakdown.tsx` | Donut chart + legend component |
| `src/components/biggest-mover-card.tsx` | Biggest mover callout card |
| `src/components/category-filter-header.tsx` | Drill-down header with sub-total (B.3) |
| `src/lib/__tests__/format-compact-currency.test.ts` | Unit tests for compact currency formatting |
| `src/lib/__tests__/portfolio-utils.test.ts` | Unit tests for biggest mover computation |

### Modified files

| File | Change |
|---|---|
| `src/server/api/routers/portfolio.ts` | Add `breakdown` procedure |
| `src/server/api/routers/assets.ts` | Add `category` field to assets; add `usdSellPrice`, `eurSellPrice` to response |
| `src/components/portfolio-total.tsx` | Add multi-currency row (USD/EUR) |
| `src/components/asset-list-item.tsx` | Add optional `portfolioPercentage` prop (B.3) |
| `src/app/(app)/page.tsx` | Add breakdown chart section, biggest mover section, category filter state, wire new data |
| `src/lib/prices.ts` | Add `formatCompactCurrency()` export |
| `messages/fa.json` | Add `breakdown` namespace |
| `messages/en.json` | Add `breakdown` namespace |
