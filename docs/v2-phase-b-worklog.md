# v2 Phase B Worklog — Portfolio Intelligence

> **Branch:** `cursor/v2-phase-b-documentation-071d`  
> **Base:** `master` @ `f7b7ad1`  
> **Completed:** Thu 19 Mar 2026  
> **Commits:** `ca0775d`, `aa8d72b`

---

## What Was Built

All four milestones from `docs/v2-phase-b-plan.md` were implemented. No Prisma schema changes were needed — all data required for Phase B already existed in `PortfolioSnapshot.breakdown` (JSON) and `PriceSnapshot.data`.

---

## Commit 1 — `ca0775d` `feat(portfolio): add Phase B — Portfolio Intelligence`

Full implementation of all milestones.

---

### Milestone B.1 — Category Breakdown Chart (P0)

#### `src/server/api/routers/portfolio.ts` — new `breakdown` procedure

Added a `breakdown: protectedProcedure.query(...)` on the existing `portfolioRouter`. It fetches the latest `PortfolioSnapshot` and `PriceSnapshot` in parallel, then:

1. Casts `portfolioSnapshot.breakdown` safely via `Array.isArray()` — never throws on `null` or unexpected JSON shapes.
2. Iterates each `{ symbol, quantity, valueIRT }` item and calls `findBySymbol(prices, symbol)` to resolve `base_currency.category.symbol`, falling back to `'OTHER'` when the symbol is absent from the snapshot.
3. Accumulates per-category `valueIRT` totals and per-asset arrays into a `Map`.
4. Orders the result using `sortedGroupEntries(categoryMap)` (see prices.ts change below) so display order matches the canonical `categoryOrder` from `prices.ts`.
5. Returns `{ totalIRT, categories: BreakdownCategory[] }` or `null` when no snapshot exists or `totalIRT === 0`.

#### `src/server/api/routers/assets.ts` — `list` enrichment

Three new fields appended to the `assets.list` response:

- `category: string` — `priceItem?.base_currency.category?.symbol ?? 'OTHER'` per asset, enabling client-side category filtering without a separate lookup.
- `usdSellPrice: number | null` — `getSellPriceBySymbol('USD', prices)` at the response root; `null` when USD is absent from the snapshot.
- `eurSellPrice: number | null` — same pattern for EUR.

#### `src/lib/category-colors.ts` — new file

Static `oklch()` color map for all 15 categories plus a `getCategoryColor(category)` getter. Colors are hardcoded string literals, not CSS `var()` references — no DOM read or `useEffect` required.

| Category | Color (light-mode reading) |
|---|---|
| `CURRENCY` | Blue — `oklch(0.65 0.18 250)` |
| `CRYPTOCURRENCY` | Purple — `oklch(0.65 0.18 310)` |
| `GOLD` | Gold/amber — `oklch(0.75 0.16 85)` |
| `COIN` | Warm orange — `oklch(0.70 0.14 55)` |
| `SILVER` | Silver/gray — `oklch(0.70 0.02 0)` |
| `BORS` | Teal — `oklch(0.60 0.12 180)` |
| remaining 9 | Distinct hues, lower chroma |

#### `src/lib/prices.ts` — `sortedGroupEntries` made generic

`sortedGroupEntries` was previously typed as `(grouped: Map<string, PriceItem[]>)`. Its signature was widened to `<T>(grouped: Map<string, T>)` so the `portfolio.breakdown` procedure can reuse the same two-pass ordering logic (canonical `categoryOrder` first, unknown categories appended) without duplicating it.

#### `src/components/portfolio-breakdown.tsx` — new file

Recharts `PieChart` donut chart with:

- `innerRadius={55}`, `outerRadius={85}` — donut proportions tuned for mobile widths.
- `paddingAngle={2}` when more than one segment is present.
- Per-`PieCell` (aliased from recharts `Cell` to avoid shadowing the project's `ui/cell.tsx`) color from `getCategoryColor()`.
- Selected segment: `stroke="var(--foreground)"`, `strokeWidth={2}`; unselected-while-other-selected: `opacity={0.35}`.
- `onClick` handler on each cell calls `selectionChanged()` haptic then toggles `selectedCategory` via the `onCategorySelect` callback.
- `<Tooltip>` with a custom `DonutTooltip` component matching the existing `ChartTooltip` style (same border/surface/shadow pattern as `portfolio-chart.tsx`).
- Absolute-positioned center label (total IRT + "ترکیب سبد" subtitle) layered over the SVG via `position: relative` on the `dir="ltr"` wrapper.
- Custom legend below the chart — clickable color-dot + category name + percentage, wrapping to multiple rows.
- `dir="ltr"` wrapper matching the existing `PortfolioChart` RTL fix pattern.

**Props:**
```typescript
interface PortfolioBreakdownProps {
  data: { category: string; valueIRT: number; percentage: number }[]
  totalIRT: number
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}
```

#### `src/app/(app)/page.tsx` — wiring

- New `api.portfolio.breakdown.useQuery` with `refetchInterval: 30 * 60 * 1000`.
- `useState<string | null>(null)` for `selectedCategory`.
- `useMemo`-derived `filteredAssets`: either all assets or those where `asset.category === selectedCategory`.
- `useMemo`-derived `selectedCategoryData`: finds the matching entry in `breakdownQuery.data.categories`.
- Breakdown chart section rendered between the portfolio trend chart and the alerts section; guarded by `breakdownQuery.data && data.assets.length > 0`.
- Asset list section now passes `portfolioPercentage` when a category is active.
- `PortfolioBreakdown` loaded via `dynamic(...)` with `ssr: false` — same pattern as `PortfolioChart`.

---

### Milestone B.2 — Multi-Currency Portfolio Total (P0)

#### `src/lib/prices.ts` — `formatCompactCurrency`

New export. Always uses `en-US` locale (not `fa-IR`) for foreign currency display so `$` / `€` symbols and the compact suffix (`K`, `M`) remain internationally recognizable regardless of the app's locale setting:

```typescript
// value < 1000  →  ≈ $742
// value = 7142  →  ≈ $7.1K
// value = 142000 →  ≈ $142K
// value = 1420000 →  ≈ €1.4M
```

#### `src/components/portfolio-total.tsx` — USD/EUR row

Added optional `usdSellPrice?: number | null` and `eurSellPrice?: number | null` props. When either price is available, a `dir="ltr"` secondary row renders below the IRT total showing `formatCompactCurrency(totalIRT / sellPrice, currency)` in `text-muted-foreground text-sm`. If neither sell price is available (e.g. Ecotrust snapshot has no USD/EUR entries) the row is entirely absent.

---

### Milestone B.3 — Category Drill-Down (P1)

#### `src/components/category-filter-header.tsx` — new file

Rendered as the first child of the asset list `Section` body (not passed as the `header` prop — doing so would produce `<h2><div><button>…` which is invalid HTML). Shows:

- Category color dot (1.25rem circle, `getCategoryColor()`).
- Localized category name (`useTranslations('categories')`).
- Sub-total: `formatIRT(valueIRT)` and `percentage%` of portfolio in `text-muted-foreground`.
- "نمایش همه" + `<IconX size={12} />` dismiss button.

#### `src/components/asset-list-item.tsx` — `portfolioPercentage` prop

New optional `portfolioPercentage?: number | null` prop. When provided, renders a third line in the trailing column below `ChangeLabel`:

```tsx
<Text className="text-muted-foreground text-xs tabular-nums">
  {pct}% {tBreakdown('ofPortfolio')}
</Text>
```

Uses `tBreakdown` (from `useTranslations('breakdown')`) for the "از سبد" / "of portfolio" label, consistent with other i18n patterns.

---

### Milestone B.4 — Biggest Mover Highlight (P1)

#### `src/lib/portfolio-utils.ts` — new file

`computeBiggestMover(assets)` iterates the already-fetched `assets.list` response:

```
deltaIRT = valueIRT - (valueIRT / (1 + changePct / 100))
```

Returns the asset with the highest `Math.abs(deltaIRT)`. Guards:
- Skips assets with `null` or non-numeric `change` strings.
- Skips `changePct === 0`.
- Guards `denominator <= 0` — prevents `Infinity` delta when `changePct === -100` (full price collapse) or more extreme values from leveraged/inverse products.
- Applies a `MIN_DELTA_IRT = 1000` threshold to filter noise from tiny holdings.
- Returns `null` when no qualifying asset exists.

#### `src/components/biggest-mover-card.tsx` — new file

```
┌──────────────────────────────────┐
│ 📈 طلا ۱۸ عیار   +۳۲۰,۰۰۰ ت   │
│                  (+۲.۱%) امروز  │
└──────────────────────────────────┘
```

Key implementation details:
- `Intl.NumberFormat` with `signDisplay: 'always'` for both the IRT delta and the percentage — ensures `−` appears correctly for negative movers (manual sign prepending dropped the minus).
- `bg-success/10` / `bg-destructive/10` as background tint.
- `tAssets('tomanAbbr')` for the Toman abbreviation — uses the existing i18n key rather than an inline locale ternary.
- `dir="ltr"` on the trailing column to keep numbers left-to-right.

#### `src/app/(app)/page.tsx` — wiring

```typescript
const biggestMover = useMemo(
  () => (data ? computeBiggestMover(data.assets) : null),
  [data],
)
```

Section rendered between the breakdown chart and the alerts section; guarded by `biggestMover !== null`.

---

### i18n — `breakdown` namespace

Added to both `messages/fa.json` and `messages/en.json`:

| Key | fa | en |
|---|---|---|
| `title` | ترکیب سبد | Portfolio Breakdown |
| `biggestMover` | بیشترین تغییر | Biggest Mover |
| `filterActive` | فیلتر: {category} | Filter: {category} |
| `showAll` | نمایش همه | Show All |
| `ofPortfolio` | از سبد | of portfolio |
| `today` | امروز | today |
| `noData` | برای مشاهده ترکیب سبد، حداقل یک دارایی اضافه کنید | Add at least one asset to see your portfolio breakdown |

---

### Unit tests

#### `src/lib/__tests__/format-compact-currency.test.ts` — 11 tests

Covers boundary values (`0`, `742`, `999`, `1000`, `7142`, `142000`, `1420000`), both currencies, correct symbol placement, and rounding of fractional values under 1000.

#### `src/lib/__tests__/portfolio-utils.test.ts` — 12 tests

Covers empty array, all-null changes, all-zero changes, below-threshold delta, single positive, single negative, highest-absolute-delta selection, negative beating positive, null-change skipping, NaN-change skipping, and exact delta arithmetic for both positive and negative cases.

---

## Commit 2 — `aa8d72b` `refactor(portfolio): apply Phase B code review fixes`

Three parallel code-review subagents (simplicity/DRY, correctness, conventions) ran against the full diff and identified 19 issues. All HIGH and MEDIUM items were addressed; LOW items where the fix improved readability were also applied.

---

### Bugs fixed

| Severity | Issue | Fix |
|---|---|---|
| HIGH | `computeBiggestMover`: `changePct = −100` produces denominator `0` → `deltaIRT = Infinity`, which passes the `MIN_DELTA_IRT` guard and reaches `BiggestMoverCard` | Added `if (denominator <= 0 \|\| !Number.isFinite(denominator)) continue` before the division |
| HIGH | `portfolio.breakdown`: `latestSnap.breakdown as BreakdownItem[]` is an unchecked cast — `null` or a non-array `JsonValue` throws `TypeError: ... is not iterable` (tRPC 500 for that user on every request) | Replaced with `Array.isArray(latestSnap.breakdown) ? ... : []` |
| MEDIUM | `selectedCategory` never auto-cleared when the user deletes the last asset in the active category → asset list shows empty with no filter indicator and no explanation | Added `useEffect` that calls `setSelectedCategory(null)` when `data.assets.some(a => a.category === selectedCategory)` is false |
| MEDIUM | `StalenessBanner.onRefresh` omitted `breakdownQuery.refetch()` — stale banner refresh left the donut chart on old data while the asset list and chart updated | Added `breakdownQuery.refetch()` to the `Promise.all` array |
| MEDIUM | `BiggestMoverCard` computed `deltaFormatted` as `` `${sign}${formatIRT(Math.abs(deltaIRT))}` `` where `sign = isPositive ? '+' : ''` — negative movers showed no minus sign | Replaced with `Intl.NumberFormat` + `signDisplay: 'always'` on the raw `deltaIRT` value, matching the percentage format already in use |

---

### Invalid HTML fixed

| Issue | Fix |
|---|---|
| `CategoryFilterHeader` (a `<div>` containing a `<Button>`) was passed as the `header` prop of `Section`, which wraps it in `<h2>` — producing `<h2><div><button>`, flow content inside a heading | Moved `CategoryFilterHeader` to be the first child inside the `Section` body; the `header` prop always receives a plain string (`t('assetsList')`) |

---

### Refactors applied

| Issue | Fix |
|---|---|
| `PortfolioBreakdown` called `getCategoryColor()` (pure synchronous static-map lookup) inside `useState` + `useEffect`, triggering a second render on every `data` change with no benefit | Removed state and effect entirely; `getCategoryColor(entry.category)` is called directly in the render |
| Recharts `Cell` import shadowed the project's `src/components/ui/cell.tsx` export, creating silent naming ambiguity | Aliased to `PieCell` in the import statement |
| `portfolio.breakdown` duplicated the two-pass `categoryOrder`-then-unknown sort logic already in `sortedGroupEntries` | Made `sortedGroupEntries` generic (`<T>`) and used it in the breakdown procedure — the two explicit loops were replaced by a single `.map()` |
| `formatCompactCurrency` had two `return` branches with identical `` `≈ ${symbol}${...}` `` template, differing only in number formatting | Collapsed to a single return with a ternary inside the template string |
| `PortfolioTotal` computed `showUsd` and `showEur` variables then re-evaluated the same conditions verbatim inside the block they gate | Inner conditions replaced with `{showUsd && ...}` and `{showEur && ...}` |
| `BiggestMoverCard` rendered `{locale === 'fa' ? 'ت' : 'T'}` inline — bypassed the `assets.tomanAbbr` i18n key already used by every other component | Replaced with `tAssets('tomanAbbr')` |
| `CategoryFilterHeader` dismiss button used a hardcoded Unicode `←` arrow | Replaced with `<IconX size={12} />` from `@tabler/icons-react`, consistent with the rest of the codebase |
| Legend rounded category percentages to `maximumFractionDigits: 0` with manual `Math.round`, showing `0%` for holdings under 0.5% | Changed to `maximumFractionDigits: 1`, matching the tooltip; dropped the manual `Math.round` (the formatter rounds internally) |
| `historyQuery`, `breakdownQuery`, `alertsQuery` lacked `refetchOnWindowFocus: true` while `assets.list` had it, causing partial staleness on app focus | Added `refetchOnWindowFocus: true` to all three queries |

---

## Final file inventory

### New files (7)

| File | Purpose |
|---|---|
| `src/lib/category-colors.ts` | Static per-category `oklch()` color map + `getCategoryColor()` |
| `src/lib/portfolio-utils.ts` | `computeBiggestMover()` utility + `BiggestMover` type |
| `src/components/portfolio-breakdown.tsx` | Recharts donut chart with tap-to-filter, legend, tooltip |
| `src/components/biggest-mover-card.tsx` | 24h biggest mover callout card |
| `src/components/category-filter-header.tsx` | Drill-down header with color dot, sub-total, dismiss |
| `src/lib/__tests__/format-compact-currency.test.ts` | 11 unit tests for `formatCompactCurrency` |
| `src/lib/__tests__/portfolio-utils.test.ts` | 12 unit tests for `computeBiggestMover` |

### Modified files (8)

| File | Change |
|---|---|
| `src/server/api/routers/portfolio.ts` | Add `breakdown` procedure |
| `src/server/api/routers/assets.ts` | Add `category`, `usdSellPrice`, `eurSellPrice` to `list` response |
| `src/lib/prices.ts` | Add `formatCompactCurrency`; make `sortedGroupEntries` generic |
| `src/components/portfolio-total.tsx` | Add multi-currency USD/EUR secondary row |
| `src/components/asset-list-item.tsx` | Add optional `portfolioPercentage` prop with inline badge |
| `src/app/(app)/page.tsx` | Wire all Phase B features; add category filter state and auto-clear |
| `messages/fa.json` | Add `breakdown` namespace (7 keys) |
| `messages/en.json` | Add `breakdown` namespace (7 keys) |

---

## Architecture decisions

| Decision | Rationale |
|---|---|
| Category breakdown computed server-side (`portfolio.breakdown` tRPC) | Category resolution requires cross-referencing `PortfolioSnapshot.breakdown` with `PriceSnapshot.data`. Keeping this on the server prevents the `PriceItem` category structure from leaking to the client and makes the donut component purely presentational |
| USD/EUR conversion computed client-side in `PortfolioTotal` | Both `totalIRT` and the sell prices are already available in the already-fetched `assets.list` response. Computing `totalIRT / usdSellPrice` client-side avoids an extra server round-trip |
| `selectedCategory` state lives in `page.tsx` | The filter affects both the donut chart (which segment is highlighted) and the asset list (which rows are shown). Lifting state to the shared parent is the correct React composition — no context or external store needed |
| `PortfolioBreakdown` loaded via `dynamic(..., { ssr: false })` | Recharts requires `window`/`document`; SSR would throw. Consistent with how `PortfolioChart` is loaded |
| Static `oklch()` color strings (not CSS `var()`) in `category-colors.ts` | Unlike the `PortfolioChart` colors (which must read `--accent` from the live computed style to stay in sync with Telegram's runtime theme), category colors are fixed palette choices that do not need to adapt to theme variables. No `useEffect`/`getComputedStyle` round-trip required |

---

## Decisions deviating from the plan

| Plan | Actual | Reason |
|---|---|---|
| `CategoryFilterHeader` as the `Section` `header` prop | Rendered inside the `Section` body as the first child | Passing a `<div>` (with a `<Button>` inside) as the `header` prop produces `<h2><div><button>` — invalid HTML5 (`<div>` is flow content, prohibited inside `<h2>`) |
| `portfolio.breakdown` uses custom two-pass loop for `categoryOrder` sorting | Uses the now-generic `sortedGroupEntries` from `prices.ts` | Avoids duplicating the identical ordering logic that already existed in the lib |
| `BiggestMoverCard` formats delta with `formatIRT(Math.abs(deltaIRT))` + manual sign prepend | `Intl.NumberFormat` with `signDisplay: 'always'` on raw `deltaIRT` | The manual prepend assigned `sign = ''` for negative values, silently dropping the minus sign |

---

## Verification

```bash
pnpm test        # 81 tests, 8 files — all passing (23 new: 11 formatCompactCurrency, 12 computeBiggestMover)
pnpm lint        # Biome: 0 errors, 0 warnings
pnpm typecheck   # 0 new errors (pre-existing validator.ts route-group issue unrelated)
```

Manual: `pnpm dev` — app loads at `localhost:3000`; `≈ $0 ≈ €0` visible in portfolio hero on empty state; no JavaScript console errors. Breakdown chart and biggest mover sections are correctly absent when no assets exist (both guarded by `data.assets.length > 0`).
