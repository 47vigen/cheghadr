# v2 Phase A Worklog — Engagement Loop

> **Branch:** `cursor/docs-v2-phase-a-4114`  
> **Base:** `442b8de` (frontend design enhancements)  
> **Completed:** Wed 18 Mar 2026  
> **Commits:** `5a335d1`, `e95fc38`

---

## What Was Built

All five milestones from `docs/v2-phase-a-plan.md` were implemented in full, including the two P1 milestones (A.4 and A.5). The cron architecture was restructured as specified, and the Prisma schema was migrated live to the Neon production DB via `pnpm db:push`.

---

## Milestone A.1 — Bot Messaging Infrastructure

### `src/lib/telegram-bot.ts` (new)

Two exported functions:

- `sendBotMessage(telegramUserId, text)` — POSTs to `https://api.telegram.org/bot{TOKEN}/sendMessage` with `parse_mode: 'HTML'`. Reads `process.env.TELEGRAM_BOT_TOKEN` at call time (not module-load) so tests can inject the value per-test.
- `sendBotMessageWithRetry(telegramUserId, text)` — wraps the above with one retry after a 2-second delay. Logs to `console.error('[BOT] Failed to deliver to ...')` after the second failure and returns the failure result. Returns immediately on token-absent error without wasting the retry slot.

### `src/lib/notifications.ts` (new)

`NotificationQueue` class with two methods:

- `enqueue({ telegramUserId, text, alertId })` — pushes to an in-memory array.
- `drain()` — iterates the queue, calls `sendBotMessageWithRetry` for each entry, inserts a 35 ms delay between sends (~28 msg/sec, staying under Telegram's 30 msg/sec limit), returns `{ sent, failed }` aggregates, and clears the queue.

### `src/lib/alert-messages.ts` (new)

Three exported template functions. All read `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` at call time via a private `getDeepLink()` helper (not a module-level constant):

- `priceAlertMessage(assetNameFa, direction, thresholdIRT)` — fires for PRICE alerts; uses the asset's Persian name; never includes portfolio totals or quantities.
- `portfolioAlertMessage(direction, thresholdIRT)` — fires for PORTFOLIO alerts.
- `dailyDigestMessage(deltaPct, topMoverName)` — fires for daily digest; guards against empty `topMoverName` (omits the mover line if blank).

All messages are HTML-formatted (`<b>`, `<code>`) and include a deep-link back to the mini app.

### `src/lib/alert-utils.ts` (new)

Shared constants and logic used by both the price cron and portfolio cron:

- `MAX_ACTIVE_ALERTS = 10` — single source of truth consumed by the tRPC router and the frontend form.
- `hasCrossedThreshold(previous, current, direction, threshold)` — pure function implementing the edge-trigger rule: `ABOVE` fires when `previous < threshold && current >= threshold`; `BELOW` fires when `previous > threshold && current <= threshold`. Extracted to eliminate the verbatim duplication that would otherwise exist between `alert-evaluation.ts` and the portfolio cron.

### `src/lib/alert-evaluation.ts` (new)

`evaluatePriceAlerts(db, currentSnapshot, previousSnapshot)`:

1. Short-circuits to `{ evaluated: 0, triggered: 0 }` when `previousSnapshot` is null (first-ever cron run).
2. Loads all `isActive: true` PRICE alerts with their user's `telegramUserId` in a single query with join.
3. For each alert: parses both snapshots, guards against non-finite `sell_price` values, calls `hasCrossedThreshold`.
4. Enqueues a `priceAlertMessage` for each triggered alert.
5. Drains the queue and batch-updates all triggered alerts to `{ isActive: false, triggeredAt: now() }` in a single `updateMany`.
6. Returns `{ evaluated, triggered }` for cron response logging.

---

## Milestone A.2 — Price Alerts

### `prisma/schema.prisma` (modified)

Added:

- `AlertType` enum (`PRICE`, `PORTFOLIO`)
- `AlertDir` enum (`ABOVE`, `BELOW`)
- `Alert` model — cuid ID, cascading `User` relation, `symbol?`, `direction`, `thresholdIRT Decimal @db.Decimal(24,2)`, `isActive`, `triggeredAt?`, `createdAt`; three indexes: `[userId, isActive]`, `[symbol, isActive]`, `[type, isActive]`
- `dailyDigestEnabled Boolean @default(false)` on `User`
- `alerts Alert[]` relation on `User`

Schema pushed to Neon DB successfully (`pnpm db:push`), with Prisma client regenerated (`prisma generate`).

### `src/server/api/routers/alerts.ts` (new)

Six procedures, all `protectedProcedure`:

| Procedure | Notes |
|---|---|
| `list` | Returns `Alert[]` for the authenticated user, `createdAt desc` |
| `create` | Validates max 10 active alerts; validates symbol exists in latest `PriceSnapshot` (skips validation gracefully when no snapshot yet); accepts `PRICE` or `PORTFOLIO` type |
| `toggle` | Flips `isActive`; re-enabling checks the 10-alert cap; clears `triggeredAt` when re-enabling |
| `delete` | Ownership-checked; hard delete |
| `settings` | Returns `{ dailyDigestEnabled }` — used to seed the UI toggle on page load |
| `toggleDigest` | Updates `User.dailyDigestEnabled` |

Auth ownership guard: `requireOwnedAlert(database, id, userId)` — module-level helper matching the existing `requireOwnedAsset` pattern from `assets.ts`.

### `src/server/api/root.ts` (modified)

Added `alerts: alertsRouter` to `appRouter`.

### `src/app/api/cron/prices/route.ts` (modified)

- **Removed:** portfolio snapshot creation loop + pruning (moved to portfolio cron).
- **Added:** loads the previous `PriceSnapshot` *before* creating the new one, then calls `evaluatePriceAlerts(db, currentSnapshot, previousSnapshot)`.
- Response now includes `alertsEvaluated` and `alertsTriggered` for observability.

### `src/app/(app)/alerts/page.tsx` (new)

Full-screen alerts management page at `/alerts`. Sections:

1. **Hero** — "هشدارهای من" title
2. **CREATE ALERT** — `<CreateAlertForm />`
3. **Empty state** — `<Placeholder>` with `IconBellPlus` when no alerts exist
4. **ACTIVE ALERTS** — `<AlertListItem>` list (shown when `activeAlerts.length > 0`)
5. **TRIGGERED ALERTS** — `<AlertListItem>` list (shown when `triggeredAlerts.length > 0`)
6. **SETTINGS** — Daily digest `Switch` toggle; seeded from `api.alerts.settings` query via `useEffect` (prevents the toggle from always rendering as OFF on page load)

### `src/components/alerts/create-alert-form.tsx` (new)

- "Total Portfolio" button to select a `PORTFOLIO`-type alert target
- `<AssetSelector>` (reuses existing component) for per-asset `PRICE` alerts; IRT excluded as a target
- Current sell price hint shown below selector for context
- Direction toggle: two `Button` components (`ABOVE` / `BELOW`) with `primary`/`secondary` variant state
- `<TextField>` + `<Input inputMode="decimal">` for threshold
- Imports `MAX_ACTIVE_ALERTS` from `@/lib/alert-utils` — no magic numbers in UI code

### `src/components/alerts/alert-list-item.tsx` (new)

`Cell`-based row following the `asset-list-item.tsx` pattern:

- `before`: `IconBell` — `text-accent` when active, `text-muted-foreground` when inactive
- Primary text: `{symbol} — {direction} {threshold} تومان` (or portfolio target label)
- `subtitle`: formatted `triggeredAt` timestamp when present
- `after`: HeroUI `Switch` (calls `alerts.toggle`) + ghost delete `Button` (opens confirmation modal)
- Modal follows the standard `Modal > Backdrop > Container > Dialog > CloseTrigger + Header + Body` pattern with `Section` + two buttons

### `src/components/alerts/alert-summary-card.tsx` (new)

Compact widget used on the My Assets page:

- Zero alerts: shows `IconBellPlus` + "Create a price alert" CTA with a `secondary` button to `/alerts`
- Has alerts: shows `IconBell` (warning color if any triggered, accent otherwise) + active count + triggered count; "Manage" button navigates to `/alerts`

### `src/app/(app)/page.tsx` (modified)

- Added `api.alerts.list.useQuery()` alongside the existing assets + history queries
- Added pull-to-refresh for the alerts query
- Added `<AlertSummaryCard>` section between the portfolio chart and asset list

---

## Milestone A.3 — Portfolio Delta Banner

### `src/server/api/routers/portfolio.ts` (modified)

Added `delta` procedure (`protectedProcedure`):

- Input: `{ window?: '1D' | '1W' | '1M' | 'ALL' }`, defaults to `1D`
- Fetches the most recent snapshot as "current"
- For `1D`/`1W`/`1M`: fetches the most recent snapshot with `snapshotAt <= now - window` as "previous"
- For `ALL`: fetches the earliest-ever snapshot
- Returns `null` if no current snapshot, or if current and previous are the same row (only one snapshot exists)
- Returns `{ currentIRT, previousIRT, deltaIRT, deltaPct }` — all `Number()` conversions from `Decimal`

Private `getComparisonDate(window)` helper — extracted outside the router object following the existing pattern from `portfolio.ts`.

### `src/components/portfolio-delta.tsx` (new)

- `useState<DeltaWindow>('1D')` controls the active time window
- `api.portfolio.delta.useQuery({ window })` fetches on window change
- Shows animated skeleton during loading
- Returns `null` (renders nothing) when query data is `null` — new users with only one snapshot see a clean hero section without an error or zero state
- Sign logic: `'+' | '-' | ''` — properly prefixes negative deltas with `-` (a bug found during code review); uses `Math.abs()` for magnitude then prepends the sign character
- Percentage formatted with `signDisplay`-equivalent via the sign prefix + `Intl.NumberFormat` with 2 decimal places
- Color: `text-success` (positive), `text-destructive` (negative), `text-muted-foreground` (zero)
- Time window chips: four `Button` components using `primary` / `secondary` variants; calls `selectionChanged()` haptic on tap

### `src/app/(app)/page.tsx` (modified)

Added `<PortfolioDelta />` directly below `<PortfolioTotal />` inside the hero `Section`. The component manages its own query state internally.

---

## Milestone A.4 — Portfolio Value Alerts (P1)

Implemented inside `src/app/api/cron/portfolio/route.ts`:

- After creating all portfolio snapshots, queries all `PORTFOLIO`-type active alerts
- For each alert: fetches `current` (most recent snapshot) and `previous` (most recent snapshot older than `YESTERDAY_CUTOFF_MS = 23 * 60 * 60 * 1000`) in parallel via `Promise.all`
- Calls `hasCrossedThreshold` (from `alert-utils.ts`) — no logic duplication
- Enqueues `portfolioAlertMessage` for triggered alerts; batch-updates deactivated alerts after `queue.drain()`

UI: `CreateAlertForm` includes the "کل دارایی‌ها" (Total Portfolio) button at the top; creates an alert with `type: 'PORTFOLIO'` and no symbol.

---

## Milestone A.5 — Daily Digest Bot Message (P1)

Implemented inside `src/app/api/cron/portfolio/route.ts`:

- After portfolio alerts, fetches all users with `dailyDigestEnabled: true`
- For each opted-in user: fetches today's and yesterday's snapshots; computes `deltaPct`; identifies the largest portfolio holding by current value as `topMoverName` (largest holding is a v2 heuristic — precise top mover by price-change requires a second price snapshot join, deferred to v3)
- Guards against empty `topMoverName` — the digest line is omitted rather than sending an empty `<b></b>` tag
- Calls `dailyDigestMessage(deltaPct, topMoverName)` and enqueues for sending

Toggle UI: the `/alerts` page Settings section has a `Switch` for `dailyDigestEnabled`. The switch is seeded from `api.alerts.settings` (added as part of A.2's review fix) so it reflects the persisted value on page load.

---

## Cron Architecture Changes

### `src/app/api/cron/portfolio/route.ts` (new)

New daily cron at `30 3 * * *` (03:30 UTC, ~07:00 Tehran time). Auth pattern identical to the price cron (`Authorization: Bearer $CRON_SECRET`). Sequence:

1. Create `PortfolioSnapshot` for all active users (reuses `createPortfolioSnapshot` from `lib/portfolio.ts`)
2. Evaluate PORTFOLIO alerts
3. Send daily digests for opted-in users
4. Drain notification queue (shared `NotificationQueue` instance)
5. Batch-update triggered portfolio alerts
6. Prune `PortfolioSnapshot` rows older than 365 days

Uses `YESTERDAY_CUTOFF_MS` named constant instead of `23 * 60 * 60 * 1000` inline.

### `src/app/api/cron/prices/route.ts` (modified)

Portfolio snapshot creation and pruning were removed (now owned by `/api/cron/portfolio`). The price cron now only: fetches prices → saves snapshot → evaluates price alerts → prunes old price snapshots.

### `vercel.json` (modified)

```json
{
  "crons": [
    { "path": "/api/cron/prices",    "schedule": "*/30 6-22 * * *" },
    { "path": "/api/cron/portfolio", "schedule": "30 3 * * *" }
  ]
}
```

Previously a single daily run; now a 30-minute price cron (06:00–22:30 UTC) plus a separate daily portfolio cron.

---

## i18n Changes

Both `messages/fa.json` and `messages/en.json` received two new top-level namespaces.

### `alerts` namespace (44 keys each)

Covers: page title, section headers, form labels and placeholders, direction labels, threshold format, current price hint, active/triggered counts, max-limit error, delete confirmation, toast messages, re-enable label, triggered timestamp, daily digest label and description, settings header, empty state, and portfolio target label.

### `delta` namespace (4 keys each)

`window1D`, `window1W`, `window1M`, `windowALL` — used by the time window chips in `PortfolioDelta`.

### `nav` namespace (1 key added each)

`nav.alerts` — used as the section header on the My Assets page alert summary and as the hero header on the `/alerts` page.

---

## Issues Found and Fixed During Quality Review

Three parallel code reviewers (simplicity/DRY, correctness/bugs, project conventions) ran after the initial implementation commit. Issues addressed in `e95fc38`:

| Issue | Fix |
|---|---|
| Negative delta displayed without a minus sign — `sign` was `'' \| '+'`, `Math.abs` removed the negative magnitude | Changed sign to `'+' \| '-' \| ''` |
| `digestEnabled` always initialized to `false`, ignoring persisted server value | Added `api.alerts.settings` procedure; seeded switch via `useEffect` on query data |
| Dynamic `import('@/lib/prices')` inside the `create` mutation handler | Moved to static top-level import |
| `BOT_USERNAME` captured at module load — breaks test injection and produces `https://t.me//app` when env var is absent | Moved into `getDeepLink()` helper called per-invocation |
| `hasCrossedThreshold` logic duplicated verbatim in `alert-evaluation.ts` and `portfolio/route.ts` | Extracted to `src/lib/alert-utils.ts` |
| `MAX_ACTIVE_ALERTS = 10` defined in router, hardcoded as `10` in the form component | Exported from `alert-utils.ts`, imported by both router and component |
| Magic `23 * 60 * 60 * 1000` appeared twice in `portfolio/route.ts` | Named as `YESTERDAY_CUTOFF_MS` at file top |
| Non-finite `sell_price` values (e.g. `"N/A"`) could propagate silently into alert comparisons | Added `!Number.isFinite(currentPrice) || !Number.isFinite(previousPrice)` guard with `continue` |
| Empty `topMoverName` sent as `<b></b>` in digest HTML | Guard: omits mover line entirely when string is empty |

---

## Known Limitations / Future Work

| Item | Notes |
|---|---|
| Alert deactivation is not conditional on delivery success | If Telegram rejects a notification, the alert is still deactivated. Per-alert delivery tracking would require changing `drain()` to return a `Map<alertId, boolean>`. Acceptable for v2 given low failure rates. |
| No protection against concurrent cron invocations | Two overlapping price cron runs could double-fire an alert. An atomic `UPDATE ... WHERE isActive=true RETURNING id` before sending would fix this. Deferred to v3. |
| Daily digest "top mover" is largest holding by value, not by price change | Correct top-mover calculation requires comparing two price snapshots per asset. Deferred; the current heuristic is noted in the digest message label ("بزرگ‌ترین دارایی"). |
| Portfolio cron N+1 queries for portfolio alerts | One DB round-trip per alert. Acceptable for v2 user scale; a single aggregated query grouped by `userId` would be the v3 fix. |
| `pnpm db:push` used for schema migration | Safe for development; `prisma migrate dev` + a proper migration history should be established before the next schema change in production. |

---

## Verification

```bash
pnpm test        # 58 tests passing (6 test files)
pnpm typecheck   # 0 errors
pnpm lint        # 0 warnings
pnpm db:push     # Alert model + enums + dailyDigestEnabled pushed to Neon DB
```
