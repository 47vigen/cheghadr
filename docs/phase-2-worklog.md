# Phase 2 Work Log

> **Branch:** `cursor/docs-phase-2-plan-3143`  
> **Started:** 2026-03-16  
> **Status:** Complete — all milestones shipped, 33 tests passing, build clean

---

## What Was Built

Phase 2 delivers the three screens that answer "چه‌قدر؟" (How much?): a full-CRUD asset portfolio tracker, a live price list grouped by category, and a real-time currency/asset converter. All UI is built exclusively with TelegramUI components — no shadcn components were added beyond the pre-existing `Button` and `Sonner`.

---

## Commits

### 1. `feat: implement Phase 2 core user features`

Full implementation of all four milestones from `docs/phase-2-plan.md`.

**Milestone 2.1 — App Shell & Navigation:**
- `src/app/(app)/layout.tsx` — route group layout with `BottomNav` and content padding above tab bar
- `src/components/bottom-nav.tsx` — `Tabbar` with three `Tabbar.Item` entries (دارایی‌های من / قیمت‌ها / ماشین حساب), active tab derived from `usePathname()`
- `src/hooks/use-telegram-back-button.ts` — `useTelegramBackButton(show)` hook; guards against missing `BackButton` API (standalone browser fallback)
- `src/types/telegram.d.ts` — added `BackButton` methods (`show`, `hide`, `onClick`, `offClick`, `isVisible`)
- `src/app/(app)/error.tsx` — Next.js App Router error boundary with Persian error message and retry button
- `src/app/(app)/loading.tsx` — centered `Spinner` for Suspense fallbacks
- `src/app/globals.css` — added missing `--warning` / `.dark --warning` CSS variables (referenced by `staleness-badge.tsx` but previously undefined)

**Milestone 2.2 — My Assets Page:**
- `src/server/api/routers/assets.ts` — replaced Phase 1 placeholder with full CRUD:
  - `assets.list` — fetches user assets + latest `PriceSnapshot` in parallel; returns enriched rows (`valueIRT`, `assetName`, `assetIcon`, `change`, `sellPrice`) plus `totalIRT`, `snapshotAt`, `stale`
  - `assets.add` — `upsert` on `(userId, symbol)` unique index; adding an existing symbol updates its quantity
  - `assets.update` — ownership-validated quantity update
  - `assets.delete` — ownership-validated delete
- `src/lib/prices.ts` — new shared utility module:
  - `parsePriceSnapshot(data)` — safely casts Prisma `JsonValue` → `PriceItem[]`
  - `findBySymbol(items, symbol)` — looks up by `base_currency.symbol`
  - `groupByCategory(items)` — groups into `Map<string, PriceItem[]>` by category symbol
  - `sortedGroupEntries(grouped)` — returns entries in the canonical 14-category display order
  - `formatIRT(value)` — `Intl.NumberFormat('fa-IR')` with rounding
  - `formatChange(change)` — signed Persian percentage with `positive` flag
  - `computeConversion(amount, from, to, items)` — `(qty × fromSell) / toSell`; IRT treated as price `1`
  - `categoryLabels` — Persian display names for all 14 `CategorySymbol` values
  - `categoryOrder` — canonical sort order for the price list
- `src/components/portfolio-total.tsx` — large IRT number with "تومان" suffix and `StalenessBadge`
- `src/components/asset-list-item.tsx` — `Cell` row with `Avatar`, quantity subtitle, IRT value + `ChangeLabel`; inline `Modal` dialogs for edit (pre-filled quantity) and delete (confirmation)
- `src/components/asset-picker.tsx` — full-page searchable asset list; filters by Persian name, English name, or symbol; grouped by category with `Section`/`Cell`; inline quantity input + save on selection
- `src/components/empty-state.tsx` — `Placeholder` with wallet icon and "افزودن دارایی" CTA
- `src/components/change-label.tsx` — reusable `<span>` with green/red color based on sign
- `src/app/(app)/page.tsx` — My Assets page: `PortfolioTotal` + asset list or `EmptyState` + FAB to `/assets/add`; 30-minute `refetchInterval` + `refetchOnWindowFocus`
- `src/app/(app)/assets/add/page.tsx` — Add Asset sub-page; calls `useTelegramBackButton(true)` and renders `AssetPicker`

**Milestone 2.3 — Price List Page:**
- `src/components/price-row.tsx` — `Cell` with `Avatar` icon, Persian name, `formatIRT(sell_price)`, `ChangeLabel`
- `src/components/price-section.tsx` — `Section` with category header wrapping `PriceRow` items
- `src/app/(app)/prices/page.tsx` — queries `prices.latest`; parses → groups → sorts → renders `PriceSection` list with `StalenessBadge`; 30-minute polling

**Milestone 2.4 — Calculator Page:**
- `src/components/asset-selector.tsx` — trigger button showing current selection; opens `Modal` with `Input` search + full scrollable asset list (same TelegramUI pattern as `AssetPicker`); includes a synthetic IRT entry
- `src/components/calculator-result.tsx` — result card with Persian-formatted number and asset name; null state placeholder
- `src/app/(app)/calculator/page.tsx` — From/To `AssetSelector` + amount `<input>` + swap `IconButton` + `CalculatorResult`; real-time: result recomputes on every amount/symbol change

**Testing:**
- `src/lib/__tests__/prices.test.ts` — 28 unit tests covering all utility functions

---

### 2. `refactor: apply Phase 6 quality review fixes`

Three parallel code reviewers (simplicity/DRY, correctness, conventions) identified these issues:

**Critical bug — hidden error state:**

`(app)/page.tsx` had `if (isLoading || !data)` before `if (isError)`. On a first-load failure TanStack Query sets `isLoading=false`, `isError=true`, `data=undefined`, so `!data → true` showed a spinner forever. Fixed by checking `isError` first.

**Moderate bug — `computeConversion` returned `"NaN"` string:**

`Number(sell_price ?? 0)` on a malformed decimal string produced `NaN`; the guard `if (fromSell === 0)` does not catch `NaN`. Replaced with `Number.parseFloat` + a `parseSellPrice` helper that returns `0` for `NaN`, making the existing zero guard effective. Same fix applied to `price-row.tsx`.

**Moderate bug — BackButton flicker from `router` dependency:**

`use-telegram-back-button.ts` listed `router` in the `useEffect` dependency array. In Next.js App Router, `router` changes identity during navigation, causing `offClick` + `hide` + re-`show` on every route change (visible flicker). Fixed with a `routerRef` pattern: a second `useEffect` keeps the ref current, while the main effect depends only on `[show]`.

**Minor bug — TOCTOU race in `update` / `delete` mutations:**

The original check-then-act pattern (`findUnique` → check `userId` → `update`) exposed a window where a concurrent delete could cause Prisma to throw an unwrapped `P2025` error. Fixed by: (1) extracting `requireOwnedAsset()` helper, and (2) adding `userId: ctx.user.id` to the `where` clause of the subsequent `update`/`delete`, so the operation is a no-op (and Prisma throws P2025) if ownership changed between steps — which is then catchable.

**DRY fixes:**
- Extracted `filterPriceItems(items, query)` to `lib/prices.ts` — was copy-pasted verbatim in `asset-picker.tsx` and `asset-selector.tsx`
- Extracted `STALE_AFTER_MINUTES = 60` constant to `lib/prices.ts` — was duplicated in `assets.ts` and `prices.ts`
- Replaced dead `allItems` array construction in `asset-selector.tsx` with a focused `getCurrentDisplay()` helper
- Removed `className={undefined}` no-op props on `ChangeLabel`

**Added 5 new tests** for the bugs found: NaN `sell_price` in `computeConversion`, IRT-to-IRT conversion, and `filterPriceItems` behaviour. Total: **33 tests**.

---

## Deviations from Plan

| Plan | Actual | Reason |
|---|---|---|
| `shadcn add dialog input skeleton` | Not installed — used TelegramUI `Modal`, `Input`, `Skeleton` instead | User instruction: use TelegramUI components when an equivalent exists |
| `z.string().cuid()` for asset IDs | `z.string().min(1)` | `.cuid()` is deprecated in Zod v4; ownership check is the real security boundary |
| `refetchInterval: 30 * 60 * 1000` per query | Same — but note the `QueryClient` default is already `refetchInterval: 15s`; the per-query override sets the longer interval correctly | No deviation; confirmed working |
| `Telegram.WebApp.MainButton` for save | Standard `Button` used | Deferred to Phase 3 per plan |
| `date-fns-jalali` for Persian dates | Not used in Phase 2 | No date display requirements in scope |

---

## Files Created / Modified

### New files (23)

| File | Purpose |
|---|---|
| `src/lib/prices.ts` | All price parsing, formatting, and conversion utilities |
| `src/lib/__tests__/prices.test.ts` | 33 unit tests |
| `src/hooks/use-telegram-back-button.ts` | Telegram BackButton integration hook |
| `src/app/(app)/layout.tsx` | App route group layout with bottom nav |
| `src/app/(app)/page.tsx` | My Assets page (default route) |
| `src/app/(app)/error.tsx` | Global error boundary (Persian) |
| `src/app/(app)/loading.tsx` | Global loading state |
| `src/app/(app)/assets/add/page.tsx` | Add Asset sub-page |
| `src/app/(app)/prices/page.tsx` | Price List page |
| `src/app/(app)/calculator/page.tsx` | Calculator page |
| `src/components/bottom-nav.tsx` | TelegramUI `Tabbar` navigation |
| `src/components/portfolio-total.tsx` | Total IRT banner with staleness badge |
| `src/components/asset-list-item.tsx` | Asset row with edit/delete modals |
| `src/components/asset-picker.tsx` | Searchable full-page asset picker |
| `src/components/asset-selector.tsx` | Modal-based asset selector (calculator) |
| `src/components/calculator-result.tsx` | Conversion result display |
| `src/components/change-label.tsx` | Green/red percentage change label |
| `src/components/empty-state.tsx` | TelegramUI `Placeholder` empty state |
| `src/components/price-row.tsx` | Price list row (Cell + Avatar) |
| `src/components/price-section.tsx` | Grouped price category section |

### Modified files (5)

| File | Change |
|---|---|
| `src/server/api/routers/assets.ts` | Full CRUD replacing Phase 1 placeholder |
| `src/types/telegram.d.ts` | Added `BackButton` type declarations |
| `src/app/globals.css` | Added `--warning` CSS variable (light + dark) |
| `src/app/page.tsx` | Deleted — replaced by `src/app/(app)/page.tsx` |

---

## Verification

```bash
# 33 unit tests
pnpm test

# TypeScript: zero errors
pnpm typecheck

# Biome lint: zero errors
pnpm lint

# Production build: all 9 routes generated
pnpm build

# Live price data (281 items at time of writing)
# GET /api/trpc/prices.latest?batch=1&input={"0":{"json":null}}
```

All four checks were green at the time of the final commit.

---

## Known Limitations / Phase 3 Items

| Item | Notes |
|---|---|
| Telegram Login Widget shows "Bot domain invalid" in local dev | Expected — widget requires a BotFather-registered domain |
| Cron runs once daily on Vercel Hobby | Upgrade to Vercel Pro to restore 30-minute snapshots |
| Calculator IRT option always shows "IRT" symbol (no icon) | IRT is a synthetic entry; no logo in the Ecotrust dataset |
| `Telegram.WebApp.MainButton` not used for save actions | Deferred polish item — standard `Button` covers MVP |
| Price list has no search / filter | Deferred to Phase 3 (P1 nice-to-have per plan) |
| Pull-to-refresh not implemented | 30-minute auto-refresh + `refetchOnWindowFocus` covers the use case |
| Loading skeletons not implemented | Basic `Spinner` is sufficient for MVP; skeletons are Phase 3 polish |
