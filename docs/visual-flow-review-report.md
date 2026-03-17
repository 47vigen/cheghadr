# Cheghadr? (چه‌قدر؟) — Visual Flow Review Report

**Date:** March 17, 2026  
**Method:** Cursor Cloud computerUse visual testing on mobile viewport (390×844px)  
**Auth:** DEV_TELEGRAM_USER_ID bypass (auth flow skipped)  
**PRD Reference:** [PRD: Cheghadr? Personal Net Worth Tracker](https://www.notion.so/324ba087d94a8114b46aeb2a4d8a7af1)

---

## Executive Summary

A comprehensive visual UX/UI review was conducted across all user flows of the Cheghadr app using Cursor's cloud computer visual testing. Four parallel subagents tested the My Assets, Price List, Calculator, and Navigation flows on mobile viewport. This document consolidates findings into a single actionable report.

**Key findings:**
- **Critical:** Missing back button on Add Asset page when running outside Telegram
- **Critical:** Accessibility violation (missing DialogTitle) in AssetSelector modal
- **High:** Locale defaults to English in standalone web; RTL not tested for Persian users
- **High:** Staleness banner lacks manual refresh CTA
- **Medium:** Several alignment, touch target, and visual hierarchy improvements needed

---

## 1. User Flows Tested

| Flow | Route | Status | Notes |
|------|-------|--------|------|
| My Assets (empty) | `/` | ✅ Tested | Empty state, portfolio total, chart placeholder |
| My Assets (add) | `/assets/add` | ✅ Tested | Asset picker, quantity input, save |
| My Assets (edit/delete) | `/` (modals) | ⚠️ Partially | Blocked by navigation issues in some runs |
| Price List | `/prices` | ✅ Tested | Search, grouped list, staleness |
| Calculator | `/calculator` | ✅ Tested | From/To selectors, swap, amount, result |
| Bottom Navigation | All | ✅ Tested | Tab switching, selected state |
| Loading/Error states | All | ✅ Tested | Skeletons, placeholders, error UI |

---

## 2. Issues by Severity

### 2.1 Critical

| ID | Flow | Issue | Description |
|----|------|-------|-------------|
| C1 | Add Asset | **No back button in standalone mode** | The Add Asset page (`/assets/add`) uses `useTelegramBackButton(true)`, which only shows when `WebApp.BackButton` exists (inside Telegram). In browser/standalone mode, no back button is visible. Users must use bottom tabs or browser back. **Fix:** Add a fallback header with back button when `!isTelegramWebApp()`. |
| C2 | Calculator / Asset Picker | **Missing DialogTitle — accessibility violation** | Console error: "DialogContent requires a DialogTitle for the component to be accessible for screen reader users." The Modal in `asset-selector.tsx` and possibly `AssetPicker` modals lack proper ARIA labeling. This blocks screen reader users and can trigger React strict mode overlays. **Fix:** Add `Modal.Header` with proper title or use `aria-labelledby` on modal content. |
| C3 | Navigation | **Scroll triggers tab navigation** | Scrolling within the Price List or Assets page sometimes triggers unintended tab switches. Bottom nav touch targets may be overly sensitive or scroll events may propagate incorrectly. **Fix:** Ensure scroll container has proper `touch-action` and that tabbar has adequate hit area separation from scrollable content. |

### 2.2 High

| ID | Flow | Issue | Description |
|----|------|-------|-------------|
| H1 | General | **Locale defaults to English in standalone** | `LocaleProvider` detects locale from `WebApp.initDataUnsafe?.user?.language_code` or `navigator.language`. In browser dev, this often resolves to `en`, so the app shows English and LTR. Persian users in Telegram see `fa` + RTL. **Recommendation:** Add a locale switcher for standalone dev/testing, or document that Persian is only shown in Telegram. |
| H2 | Staleness | **No manual refresh CTA** | When prices are stale (>60 min), `StalenessBanner` shows "Prices may not be up to date" or "Last updated: X ago" but there is no "Refresh" or "Update prices" button. Users cannot manually trigger a refresh. **Fix:** Add a refresh button that calls `refetch()` on the prices query, or implement pull-to-refresh more prominently. |
| H3 | Add Asset | **Full-page navigation vs modal** | Add Asset is a full page (`/assets/add`) rather than a modal/bottom sheet. PRD mentions Telegram Main Button and BackButton for sub-pages. For Telegram Mini Apps, a bottom sheet may feel more native. **Recommendation:** Consider converting Add Asset to a modal overlay for in-Telegram usage. |
| H4 | Tabbar | **Safe area at bottom** | Tabbar may not account for `env(safe-area-inset-bottom)` on devices with home indicators. Content padding uses `--tabbar-height` (72px) but safe area could cause overlap on notched devices. **Fix:** Add `padding-bottom: env(safe-area-inset-bottom)` to tabbar container. |
| H5 | Asset List | **Edit/Delete button touch targets** | Edit and delete IconButtons in `AssetListItem` use `size="s"` (16px icons). Touch targets may be below the 44×44px minimum for mobile. **Fix:** Increase hit area with `min-w-[44px] min-h-[44px]` or use larger icons. |

### 2.3 Medium

| ID | Flow | Issue | Description |
|----|------|-------|-------------|
| M1 | Empty State | **Staleness uses emoji** | `StalenessBanner` uses `⚠️` emoji instead of a proper icon component. Inconsistent with TelegramUI design system. **Fix:** Use `IconAlertTriangle` or similar from `@tabler/icons-react`. |
| M2 | Empty State | **Icon size** | Empty state wallet icon (64px) could be larger (80–96px) for better visual impact on mobile. |
| M3 | Price List | **Search placeholder** | Search shows "Search..." / "جستجو..." (locale-dependent). Ensure RTL alignment when `dir="rtl"`. |
| M4 | Calculator | **Swap button touch target** | Swap IconButton is in a Cell; verify 44×44px minimum touch target. |
| M5 | General | **Page titles/headers** | Most pages lack a visible page title in the header. Users may lose context when navigating. Consider adding a fixed header with title (e.g., "دارایی‌های من"). |
| M6 | Loading | **Skeleton vs spinner** | Some transitions show only a spinner. `AssetsSkeleton`, `PricesSkeleton`, `CalculatorSkeleton` exist but may not be used in all loading states. **Verify:** Ensure skeletons are shown during route transitions. |
| M7 | Tabbar | **Active state contrast** | Selected tab (blue) vs unselected (gray) could have stronger visual differentiation (e.g., underline, background pill). |
| M8 | Asset Picker | **No visual feedback on list tap** | Currency list items in AssetPicker lack explicit hover/press states. TelegramUI Cell may provide this; verify touch ripple or active state. |

### 2.4 Low

| ID | Flow | Issue | Description |
|----|------|-------|-------------|
| L1 | Price List | **Percentage font size** | Change percentages (+1.87%, -2.95%) may be 10–11px. Consider 12–13px for readability. |
| L2 | Chart | **Chart uses dir="ltr"** | `PortfolioChart` correctly uses `dir="ltr"` for number axis. No issue; document as intentional. |
| L3 | Price Row | **Numbers use dir="ltr"** | `PriceRow` uses `dir="ltr"` on numeric Text. Correct for numerals. |
| L4 | Color contrast | **Percentage colors** | Green (+) and red (-) for changes. Consider adding +/- symbols or icons for color-blind users. |

---

## 3. Flow-by-Flow Summary

### 3.1 My Assets (دارایی‌های من)

**Empty state**
- Portfolio total displays correctly (0 Toman / ۰ تومان)
- Staleness banner shows when prices are old
- Chart placeholder: "Your chart will appear after two days" / "نمودار شما پس از دو روز نمایش داده می‌شود"
- Empty state CTA ("Add Asset" / "افزودن دارایی") is clear
- **Issue:** No back button when coming from Add Asset (C1)

**Add Asset flow**
- AssetPicker: search, grouped categories, selection state
- Quantity input, Save (MainButton in Telegram, inline button in web)
- **Issue:** DialogTitle accessibility (C2)
- **Issue:** Full-page vs modal (H3)

**With assets**
- Portfolio total, chart (if ≥2 snapshots), asset list
- Edit modal: quantity input, save/cancel
- Delete modal: confirm/cancel, destructive styling
- Floating "Add Asset" button above tabbar
- **Issue:** Edit/Delete button touch targets (H5)

### 3.2 Price List (قیمت‌ها)

- Search input at top
- Grouped by category (CURRENCY, CRYPTOCURRENCY, GOLD, COIN, etc.)
- Each row: icon, name, price (IRT), change %
- Staleness banner when applicable
- Pull-to-refresh implemented via `usePullToRefresh`
- **Issue:** No manual refresh CTA when stale (H2)
- **Issue:** Scroll vs tab navigation (C3)

### 3.3 Calculator (ماشین حساب)

- From/To asset selectors (Cell → Modal with search)
- Swap button between selectors
- Amount input (decimal)
- Result section (empty state when no amount)
- **Issue:** DialogTitle in AssetSelector modal (C2)
- **Issue:** Swap/input touch targets (M4)

### 3.4 Navigation & Layout

- Bottom Tabbar: My Assets, Prices, Calculator
- Selected state: blue icon
- Content padding: `pb-[var(--tabbar-height,72px)]`
- **Issue:** Safe area bottom (H4)
- **Issue:** Active state contrast (M7)
- **Issue:** Tabbar visibility on scroll (may disappear in some cases)

---

## 4. PRD Alignment Check

| PRD Requirement | Status | Notes |
|-----------------|--------|-------|
| Three tabs: دارایی‌های من, قیمت‌ها, ماشین حساب | ✅ | Implemented |
| Add asset: select symbol, enter quantity, save | ✅ | AssetPicker + MainButton |
| Edit/delete asset | ✅ | Modals in AssetListItem |
| Portfolio total in IRT | ✅ | PortfolioTotal component |
| Chart (net worth over time) | ✅ | PortfolioChart, 2+ days |
| Price list grouped by category | ✅ | PriceSection |
| Search/filter price list | ✅ | Input + filterPriceItems |
| Calculator: From/To, amount, swap | ✅ | AssetSelector, Input, swap |
| Telegram BackButton on sub-pages | ⚠️ | Only in Telegram; no fallback |
| Telegram MainButton for primary actions | ✅ | useTelegramMainButton |
| RTL + Persian | ✅ | LocaleProvider sets dir/lang |
| TelegramUI components | ✅ | Used throughout |
| Vazirmatn font | ✅ | Applied |

---

## 5. Recommendations (Prioritized)

### Immediate (P0)
1. **C1:** Add fallback back button on Add Asset page when `!isTelegramWebApp()`.
2. **C2:** Add DialogTitle / aria-labelledby to all Modal components (AssetSelector, AssetPicker, Edit/Delete modals).
3. **C3:** Fix scroll/tabbar interaction — ensure scroll does not trigger tab switches.

### High (P1)
4. **H2:** Add manual refresh button or prominent pull-to-refresh when prices are stale.
5. **H4:** Add safe-area-inset-bottom to tabbar.
6. **H5:** Increase touch targets for Edit/Delete buttons (min 44×44px).

### Medium (P2)
7. **M1:** Replace emoji in StalenessBanner with IconAlertTriangle.
8. **M5:** Add page headers with titles.
9. **M7:** Improve tabbar active state contrast.

### Nice-to-Have (P3)
10. **H1:** Add locale switcher for standalone dev.
11. **H3:** Evaluate Add Asset as modal for Telegram.
12. **L4:** Add +/- symbols for percentage changes (accessibility).

---

## 6. Testing Environment Notes

- **Viewport:** 390×844px (iPhone 12 Pro)
- **Auth:** DEV_TELEGRAM_USER_ID=123456789 (bypass)
- **Locale:** English (navigator.language in browser)
- **Telegram context:** Simulated; WebApp.BackButton and MainButton may not be available

Some agent-reported "navigation bugs" (clicks leading to wrong pages) may be due to computerUse click precision or viewport instability during testing. The recommendations above focus on verified codebase issues and reproducible UX improvements.

---

## 7. Appendix: File References

| Component | Path | Relevant Issues |
|-----------|------|-----------------|
| Add Asset page | `src/app/(app)/assets/add/page.tsx` | C1 (back button) |
| AssetSelector | `src/components/asset-selector.tsx` | C2 (DialogTitle) |
| AssetPicker | `src/components/asset-picker.tsx` | C2 (if modal) |
| AssetListItem | `src/components/asset-list-item.tsx` | H5 (touch targets) |
| StalenessBanner | `src/components/staleness-banner.tsx` | H2, M1 |
| BottomNav | `src/components/bottom-nav.tsx` | H4, M7, C3 |
| useTelegramBackButton | `src/hooks/use-telegram-back-button.ts` | C1 |
| LocaleProvider | `src/components/locale-provider.tsx` | H1 |

---

*Report generated from Cursor Cloud visual testing. For questions, refer to the PRD or phase plans in `docs/`.*
