# v2 Phase A: Engagement Loop — Implementation Plan

> **Cheghadr? (چه‌قدر؟)** — Personal Net Worth Tracker  
> Phase A builds the outbound bot messaging infrastructure, price alerts, and portfolio delta banner — the highest-leverage investment in v2.  
> Source: [PRD v2](https://www.notion.so/326ba087d94a81f2905fc1a84caabbd9) · [Roadmap v2](https://www.notion.so/326ba087d94a8116b2dbf00ddc6548e8)  
> Phase A ships as part of **v2.0** alongside Phase B (Portfolio Intelligence).

---

## Table of Contents

1. [v1 Recap & Starting State](#1-v1-recap--starting-state)
2. [Phase A Scope](#2-phase-a-scope)
3. [Open Questions & Decisions](#3-open-questions--decisions)
4. [Architecture Decisions](#4-architecture-decisions)
5. [Data Model Changes](#5-data-model-changes)
6. [Milestone A.1 — Bot Messaging Infrastructure](#6-milestone-a1--bot-messaging-infrastructure)
7. [Milestone A.2 — Price Alerts](#7-milestone-a2--price-alerts)
8. [Milestone A.3 — Portfolio Delta Banner](#8-milestone-a3--portfolio-delta-banner)
9. [Milestone A.4 — Portfolio Value Alerts (P1)](#9-milestone-a4--portfolio-value-alerts-p1)
10. [Milestone A.5 — Daily Digest Bot Message (P1)](#10-milestone-a5--daily-digest-bot-message-p1)
11. [Cron Architecture Changes](#11-cron-architecture-changes)
12. [New tRPC Procedures](#12-new-trpc-procedures)
13. [New i18n Keys](#13-new-i18n-keys)
14. [Dependency Graph & Task Order](#14-dependency-graph--task-order)
15. [Testing Strategy](#15-testing-strategy)
16. [Definition of Done](#16-definition-of-done)

---

## 1. v1 Recap & Starting State

v1 is live as of March 18, 2026. Here's what exists and is relevant to Phase A:

| Component | v1 State | Phase A Needs |
|---|---|---|
| **Prisma schema** | `User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot` | Add `Alert` model + enums |
| **tRPC routers** | `prices` (public), `assets` (protected), `portfolio` (protected) | Add `alerts` router, extend `portfolio` with `delta` |
| **Price cron** | `/api/cron/prices` — daily at 06:00 UTC, saves `PriceSnapshot`, creates `PortfolioSnapshot` per user | Increase frequency to every 30 min; add alert evaluation step |
| **Bot token** | Used only for HMAC validation of `initData` and Login Widget | Wire `sendMessage` API call for outbound messages |
| **Portfolio total** | `PortfolioTotal` component shows `totalIRT` in Toman | Add delta row (±X IRT / Y%) below total |
| **Bottom nav** | 3 tabs: My Assets `/`, Prices `/prices`, Calculator `/calculator` | Add alerts section within My Assets (no 4th tab) |
| **i18n** | `fa.json` + `en.json` with `next-intl` | Add `alerts` and `delta` namespaces |
| **Cron trigger** | Was: Vercel `vercel.json` (Hobby: daily only) | **Production:** [cron-job.org](https://cron-job.org) — `*/30 6-22 * * *` for prices; see `docs/cron-scheduling.md` |

### Key v1 patterns to follow

- **tRPC**: Zod input validation, `protectedProcedure` for auth, `publicProcedure` for prices
- **Prisma**: cuid IDs, `onDelete: Cascade`, `Decimal` for monetary values, `Json` for flexible data
- **UI**: HeroUI v3 components (`Button`, `Modal`, `Text`), `Section` wrapper, `Cell` for list rows, `Placeholder` for empty states
- **Forms**: Controlled `useState` + HeroUI inputs (no react-hook-form), Zod on server only
- **State**: React Query via tRPC, localStorage persistence, `useUtils()` for cache invalidation
- **Telegram**: `useTelegramHaptics()` for feedback, `useTelegramBackButton()` for navigation

---

## 2. Phase A Scope

**Theme:** "Know when something changes — without opening the app"

| Milestone | Priority | Effort | Scope |
|---|---|---|---|
| **A.1** Bot Messaging Infrastructure | P0 Must | ~2.25 days | Foundation for all alert features |
| **A.2** Price Alerts | P0 Must | ~5 days | Alert model, CRUD, cron evaluation, UI |
| **A.3** Portfolio Delta Banner | P0 Must | ~1.75 days | Delta display on My Assets, time window toggle |
| **A.4** Portfolio Value Alerts | P1 Should | ~0.75 days | Extend alerts to portfolio total |
| **A.5** Daily Digest Bot Message | P1 Should | ~1 day | Opt-in daily summary via bot |

**P0 total: ~9 days** · P1 total: ~1.75 days · **Phase A total: ~10.75 days**

---

## 3. Open Questions & Decisions

These questions from the PRD must be resolved before or during Phase A. Each includes a recommendation.

### OQ-1: Alerts placement — 4th tab or sub-section within My Assets?

**Decision: Sub-section within My Assets page (with easy extraction path).**

Rationale:
- 3 tabs is a clean mobile pattern; a 4th tab crowds the nav on smaller screens
- Alerts are contextually related to "My Assets" — the user's portfolio is what they're monitoring
- The PRD's own decision rule says: "If alert creation rate < 20% at Day 2, move to 4th tab immediately" — this implies starting inside My Assets and promoting if needed
- Implementation: alerts section sits between the portfolio chart and the asset list, with a dedicated "Manage Alerts" link that opens a full-screen alerts page at `/alerts`

**Extraction path:** If discoverability metrics fail, the existing `/alerts` page can be promoted to a 4th bottom nav tab with a one-line change to `bottom-nav.tsx`.

### OQ-2: Maximum active alerts per user?

**Decision: 10 active alerts per user.**

Rationale:
- Prevents cron overload at scale (10 alerts × 10K users = 100K evaluations per cron run)
- Generous enough for meaningful coverage (1 alert per major asset class + a few specifics)
- Enforced at `alerts.create` procedure level with a clear error message

### OQ-3: Edge-trigger vs. level-trigger for alerts?

**Decision: Edge-trigger (one-shot) with manual re-enable.**

Rationale:
- Prevents notification spam (user won't get a message every 30 minutes while price stays above threshold)
- Simple mental model: "alert fires once, then I decide what to do"
- Implementation: alert fires on threshold crossing (previous price was below, current is at-or-above), sets `triggeredAt`, sets `isActive = false`
- User can re-enable from the alerts list if they want it to fire again

### OQ-4: Portfolio alerts — evaluate on price cron (every 30 min) or portfolio cron (daily)?

**Decision: Daily (portfolio snapshot cron), not every 30 minutes.**

Rationale:
- Portfolio value depends on per-user asset quantities — recalculating for all users every 30 minutes is expensive
- Daily evaluation is sufficient for portfolio-level alerts (users who need real-time precision should use price alerts for individual assets)
- The cron already creates `PortfolioSnapshot` per user; evaluating portfolio alerts is a natural extension of that step
- This is P1 anyway — revisit if user demand for higher frequency emerges

### OQ-New: Cron frequency change

**Decision: Increase price cron from daily to every 30 minutes during market hours.**

Rationale:
- The PRD acceptance criteria for price alerts assumes "two snapshots 30 minutes apart"
- Iranian financial markets (and crypto) move fast — daily-only snapshots miss intraday moves entirely
- Price alerts are meaningless if we only have one price point per day

Implementation: Configure the external scheduler (production: **cron-job.org**) with `*/30 6-22 * * *` for `/api/cron/prices` (every 30 min from 06:00 to 22:30 UTC, covering ~09:30–02:00 Tehran time). This gives ~34 snapshots/day. See `docs/cron-scheduling.md`.

**Impact on existing system:**
- `PriceSnapshot` table grows from ~1 row/day to ~34 rows/day (still negligible with 90-day pruning)
- `PortfolioSnapshot` creation has a 5-minute dedup window — the existing `createPortfolioSnapshot` will correctly skip rapid-fire calls from consecutive cron runs. But we want daily-only portfolio snapshots, not 34/day. **Solution:** move portfolio snapshot creation to a separate daily cron endpoint, or add a 24-hour dedup check in the price cron.

### OQ-New: Portfolio snapshot frequency after cron change

**Decision: Separate portfolio snapshots from price snapshots.**

The price cron should only: (1) fetch + save prices, (2) evaluate price alerts.  
A new daily cron (`/api/cron/portfolio`) should: (1) create portfolio snapshots for all users, (2) evaluate portfolio alerts (A.4), (3) send daily digests (A.5), (4) prune old snapshots.

This cleanly separates concerns and avoids creating 34 portfolio snapshots per user per day.

---

## 4. Architecture Decisions

### AD-1: Bot messaging module

```
src/lib/telegram-bot.ts
```

A pure function module (not a tRPC procedure) that wraps the Telegram Bot API `sendMessage` call. The tRPC layer is for client-facing CRUD — the bot messaging is server-side infrastructure used by cron jobs.

- `sendBotMessage(telegramUserId: bigint, text: string): Promise<SendResult>`
- Uses `fetch()` to POST to `https://api.telegram.org/bot{TOKEN}/sendMessage`
- Returns `{ success: boolean, error?: string }`
- Includes one-retry logic with exponential backoff (2s delay)
- Logs delivery failures to console (extractable to a logging service later)

**Privacy guard:** The module does NOT accept arbitrary message text from the client. All message templates are server-defined constants. Bot messages never include portfolio totals, asset quantities, or any financial detail.

### AD-2: Alert evaluation architecture

```
[Price Cron runs every 30 min]
    → Save new PriceSnapshot
    → Load previous PriceSnapshot
    → Query all active PRICE alerts (batched by symbol)
    → For each alert: compare previous vs. current price against threshold
    → For triggered alerts: queue bot messages
    → Send queued messages (with retry)
    → Update triggered alerts: set triggeredAt, isActive = false
```

Alert evaluation is **synchronous within the cron route** (acceptable for < 10K users). The evaluation loop:
1. Loads all active `PRICE` alerts with their user's `telegramUserId` (single query with join)
2. Groups alerts by symbol for efficient comparison
3. For each symbol: checks if the threshold was crossed between previous and current snapshot
4. Collects triggered alerts into a batch
5. Sends bot messages in sequence (respecting Telegram's 30 msg/sec rate limit)
6. Updates all triggered alerts in a single `updateMany`

### AD-3: In-process notifications queue

For v2, notifications are processed in-memory during the cron execution. No external queue (Inngest, Trigger.dev) is needed yet.

```typescript
interface QueuedNotification {
  telegramUserId: bigint
  text: string
  alertId: string
}
```

The queue accumulates during alert evaluation, then drains sequentially. If a send fails after one retry, it's logged as failed but does not block other notifications.

### AD-4: Alert UI placement

The My Assets page (`src/app/(app)/page.tsx`) gains a new `Section` between the portfolio chart and the asset list:

```
AssetsPage
├── Section (hero) — Portfolio Total + Delta Banner (A.3)
├── Section — Portfolio Chart
├── Section — "Alerts" (NEW — A.2)
│   ├── AlertSummaryCard (active alerts count + "Manage" link)
│   └── (if no alerts) → Placeholder with "Set your first alert" CTA
├── Section — Assets List
└── FAB — Add Asset
```

Full alert management lives at a new route `/alerts` with its own page:

```
/alerts (NEW)
├── CreateAlertForm (select asset, direction, threshold)
├── AlertsList (active/triggered alerts with toggle + delete)
└── Empty state
```

### AD-5: Portfolio delta computation

The `portfolio.delta` procedure queries two `PortfolioSnapshot` records:
- **Current:** most recent snapshot for the user
- **Comparison:** most recent snapshot on or before `now - timeWindow`

Time windows: `1D` (24h), `1W` (7d), `1M` (30d), `ALL` (earliest snapshot).

Returns `{ currentIRT, previousIRT, deltaIRT, deltaPct } | null` (null if no comparison snapshot exists).

---

## 5. Data Model Changes

### New: `Alert` model + enums

```prisma
enum AlertType {
  PRICE
  PORTFOLIO
}

enum AlertDir {
  ABOVE
  BELOW
}

model Alert {
  id           String    @id @default(cuid())
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  type         AlertType
  symbol       String?
  direction    AlertDir
  thresholdIRT Decimal   @db.Decimal(24, 2)
  isActive     Boolean   @default(true)
  triggeredAt  DateTime?
  createdAt    DateTime  @default(now())

  @@index([userId, isActive])
  @@index([symbol, isActive])
  @@index([type, isActive])
}
```

### Modified: `User` model

```prisma
model User {
  id             String              @id @default(cuid())
  telegramUserId BigInt              @unique
  createdAt      DateTime            @default(now())
  assets         UserAsset[]
  portfolioSnaps PortfolioSnapshot[]
  alerts         Alert[]              // NEW
}
```

### Migration strategy

1. Create `AlertType` and `AlertDir` enums
2. Create `Alert` table with all columns and indexes
3. Add `alerts` relation to `User`
4. No data migration needed — new table starts empty

Use `prisma db push` for development; `prisma migrate dev` for the production migration.

---

## 6. Milestone A.1 — Bot Messaging Infrastructure

**Goal:** Enable the Telegram bot to send messages to users.  
**Gate:** Must be complete before A.2.

### Task A.1.1 — Telegram Bot `sendMessage` wrapper

**File:** `src/lib/telegram-bot.ts` (new)

```typescript
interface SendResult {
  success: boolean
  messageId?: number
  error?: string
}

async function sendBotMessage(
  telegramUserId: bigint,
  text: string,
): Promise<SendResult>
```

Implementation:
- `POST https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
- Body: `{ chat_id: telegramUserId.toString(), text, parse_mode: 'HTML' }`
- Parse the Telegram API response: `{ ok: boolean, result?: { message_id } }`
- On failure: log the error, return `{ success: false, error }`

### Task A.1.2 — Delivery failure logging + one-retry logic

**File:** `src/lib/telegram-bot.ts` (extends A.1.1)

Wrap `sendBotMessage` with retry:

```typescript
async function sendBotMessageWithRetry(
  telegramUserId: bigint,
  text: string,
): Promise<SendResult>
```

- On first failure: wait 2 seconds, retry once
- On second failure: log as `[BOT] Failed to deliver to ${telegramUserId}: ${error}` and return failure
- On success: return success with `messageId`

The `console.error` logging is sufficient for v2. Structured logging (e.g., to a service) is a v3 concern.

### Task A.1.3 — Notifications queue

**File:** `src/lib/notifications.ts` (new)

```typescript
interface QueuedNotification {
  telegramUserId: bigint
  text: string
  alertId: string
}

class NotificationQueue {
  private queue: QueuedNotification[] = []

  enqueue(notification: QueuedNotification): void
  async drain(): Promise<{ sent: number; failed: number }>
}
```

- `enqueue` adds a notification to the in-memory array
- `drain` iterates through the queue, calls `sendBotMessageWithRetry` for each, tracks sent/failed counts
- Rate limiting: adds a 35ms delay between sends (~28 msg/sec, under Telegram's 30/sec limit)
- Returns aggregate results for logging

### Task A.1.4 — Message templates (privacy-safe)

**File:** `src/lib/alert-messages.ts` (new)

Centralized message templates that enforce the privacy constraint:

```typescript
function priceAlertMessage(
  assetNameFa: string,
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
  currentPrice: string,
): string

function portfolioAlertMessage(
  direction: 'ABOVE' | 'BELOW',
  thresholdIRT: string,
): string

function dailyDigestMessage(
  totalIRT: string,
  deltaPct: string,
  topMoverName: string,
): string
```

All templates:
- Use Persian text with HTML formatting (`<b>`, `<code>` for numbers)
- Include a deep-link to the mini app: `https://t.me/{BOT_USERNAME}/app`
- Never include portfolio totals, asset quantities, or identifiable financial data
- Example price alert: `🔔 هشدار قیمت\n\nقیمت فروش <b>دلار</b> از <code>۱,۵۰۰,۰۰۰</code> تومان عبور کرد.\n\n📲 مشاهده در چه‌قدر؟`

### Task A.1.5 — Unit tests for bot messaging

**File:** `src/lib/__tests__/telegram-bot.test.ts` (new)

- Mock `fetch` globally
- Test successful send
- Test retry on first failure + success on second attempt
- Test complete failure after two attempts
- Test message template privacy (no portfolio values in output)

### Task A.1.6 — Manual smoke test

- Set `TELEGRAM_BOT_TOKEN` in environment
- Call `sendBotMessage` with a real Telegram user ID
- Verify message arrives in Telegram within 5 seconds

---

## 7. Milestone A.2 — Price Alerts

**Goal:** Users can create, manage, and receive price alerts via Telegram bot.  
**Depends on:** A.1 (bot messaging infrastructure)

### Task A.2.1 — `Alert` Prisma model + migration

**File:** `prisma/schema.prisma`

Add `AlertType` enum, `AlertDir` enum, and `Alert` model as specified in [Section 5](#5-data-model-changes). Add `alerts Alert[]` relation to `User`.

Run: `pnpm db:push` (dev) or `pnpm db:migrate` (production).

### Task A.2.2 — `alerts` tRPC router

**File:** `src/server/api/routers/alerts.ts` (new)

Four procedures, all using `protectedProcedure`:

#### `alerts.list`
```typescript
// Input: none
// Output: Alert[] (user's alerts, ordered by createdAt desc)
// Includes: symbol, direction, thresholdIRT, isActive, triggeredAt, createdAt
```

#### `alerts.create`
```typescript
// Input: { type: 'PRICE', symbol: string, direction: 'ABOVE' | 'BELOW', thresholdIRT: string }
// Validation:
//   - Max 10 active alerts per user (count where isActive = true)
//   - symbol must be a valid asset symbol (exists in latest PriceSnapshot)
//   - thresholdIRT must be a positive decimal
// Output: Alert (the created alert)
```

#### `alerts.toggle`
```typescript
// Input: { id: string }
// Validation:
//   - Alert must belong to the current user
//   - If reactivating: check max 10 active alerts limit
//   - If reactivating a previously triggered alert: clear triggeredAt
// Output: Alert (updated)
```

#### `alerts.delete`
```typescript
// Input: { id: string }
// Validation: Alert must belong to the current user
// Output: void
```

### Task A.2.3 — Register alerts router

**File:** `src/server/api/root.ts`

```typescript
import { alertsRouter } from './routers/alerts'

export const appRouter = router({
  prices: pricesRouter,
  assets: assetsRouter,
  portfolio: portfolioRouter,
  alerts: alertsRouter, // NEW
})
```

### Task A.2.4 — Alert evaluation in price cron

**File:** `src/app/api/cron/prices/route.ts` (modified)

After saving the new `PriceSnapshot`, add an alert evaluation step:

```typescript
// 1. Load previous PriceSnapshot (the one before the new one)
// 2. Load all active PRICE alerts with user's telegramUserId
// 3. For each alert:
//    a. Get previous price and current price for alert.symbol
//    b. Check if threshold was crossed:
//       ABOVE: previousPrice < threshold && currentPrice >= threshold
//       BELOW: previousPrice > threshold && currentPrice <= threshold
//    c. If crossed: enqueue notification
// 4. Drain notification queue (send bot messages)
// 5. Batch-update triggered alerts: set triggeredAt, isActive = false
```

**Extract into a module:** `src/lib/alert-evaluation.ts` (new)

```typescript
async function evaluatePriceAlerts(
  db: PrismaClient,
  currentSnapshot: PriceSnapshot,
  previousSnapshot: PriceSnapshot | null,
  queue: NotificationQueue,
): Promise<{ evaluated: number; triggered: number }>
```

This keeps the cron route handler lean and the evaluation logic testable.

### Task A.2.5 — Alert evaluation unit tests

**File:** `src/lib/__tests__/alert-evaluation.test.ts` (new)

Test cases:
- Alert fires when price crosses above threshold
- Alert fires when price crosses below threshold
- Alert does NOT fire when price stays above threshold (no re-trigger)
- Alert does NOT fire when price stays below threshold
- Alert does NOT fire when isActive = false
- Alert does NOT fire when previousSnapshot is null (first snapshot)
- Multiple alerts for same symbol — all eligible ones fire
- Mixed alerts: some fire, some don't

### Task A.2.6 — Alerts page route

**File:** `src/app/(app)/alerts/page.tsx` (new)

Full-screen page for alert management. Layout:

```
AlertsPage
├── PageShell
│   ├── Section (hero) — "هشدارهای من" (My Alerts)
│   │   └── AlertsCount badge
│   ├── Section — Create Alert
│   │   └── CreateAlertForm
│   │       ├── AssetSelector (dropdown/modal — reuse price list search)
│   │       ├── DirectionSelector (above/below toggle)
│   │       ├── ThresholdInput (number input in IRT)
│   │       ├── CurrentPriceHint (shows current price for context)
│   │       └── Button — "ایجاد هشدار" (Create Alert)
│   ├── Section — Active Alerts
│   │   └── AlertListItem[] (toggle switch + delete)
│   ├── Section — Triggered Alerts
│   │   └── AlertListItem[] (with "triggered at" info + re-enable)
│   └── EmptyState (if no alerts)
```

### Task A.2.7 — `CreateAlertForm` component

**File:** `src/components/alerts/create-alert-form.tsx` (new)

- Uses `api.prices.latest` to populate asset selector (reuses `PriceItem` data)
- Asset selector: searchable modal (similar pattern to `AssetPicker` in add-asset flow)
- Direction: two `Button` toggles — "بالای" (Above) / "پایین" (Below)
- Threshold: `TextField` with IRT formatting
- Shows current sell price of selected asset as context: "قیمت فعلی: ۱,۴۵۰,۰۰۰ تومان"
- On submit: calls `api.alerts.create.useMutation()`, shows success toast, invalidates `alerts.list`
- Validation: shows error if user has 10 active alerts

### Task A.2.8 — `AlertListItem` component

**File:** `src/components/alerts/alert-list-item.tsx` (new)

Uses the `Cell` pattern from v1:

```
Cell
├── Before: Asset icon (from PriceItem)
├── Title: "{asset name} {direction} {threshold} تومان"
├── Subtitle: "ایجاد شده: {createdAt}" or "فعال شده: {triggeredAt}"
├── After: Toggle switch (active/inactive) + Delete icon button
```

- Toggle calls `api.alerts.toggle.useMutation()`
- Delete opens a confirmation modal, then calls `api.alerts.delete.useMutation()`
- Triggered alerts show in a separate section with a "re-enable" action

### Task A.2.9 — Alert summary on My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

Add a compact alert summary `Section` between the portfolio chart and asset list:

```typescript
// Show only if user has any alerts (active or triggered)
<Section header={t('alerts.sectionTitle')}>
  <AlertSummaryCard
    activeCount={alertsData.active}
    triggeredCount={alertsData.triggered}
    onManage={() => router.push('/alerts')}
  />
</Section>
```

**File:** `src/components/alerts/alert-summary-card.tsx` (new)

- Shows: "🔔 ۳ هشدار فعال" (3 active alerts) with a "مدیریت" (Manage) link
- If a recent alert was triggered: shows a highlight card "🔔 دلار از ۱,۵۰۰,۰۰۰ تومان عبور کرد" with a dismiss action
- If no alerts: shows a CTA "هشدار قیمت بسازید تا از تغییرات مطلع شوید" (Create a price alert to stay informed)

### Task A.2.10 — Empty state for alerts

**File:** Part of `src/app/(app)/alerts/page.tsx`

Uses the existing `Placeholder` component pattern:

- Icon: `IconBellPlus` (from `@tabler/icons-react`)
- Title: "هنوز هشداری ندارید" (No alerts yet)
- Description: "هشدار قیمت بسازید تا هنگام تغییرات مهم بازار مطلع شوید" (Create a price alert to be notified of significant market changes)
- Action: Button that scrolls to / reveals the create form

---

## 8. Milestone A.3 — Portfolio Delta Banner

**Goal:** Show portfolio gain/loss compared to previous time periods.  
**Independent of A.1/A.2** — can be developed in parallel.

### Task A.3.1 — `portfolio.delta` tRPC procedure

**File:** `src/server/api/routers/portfolio.ts` (modified)

```typescript
delta: protectedProcedure
  .input(z.object({
    window: z.enum(['1D', '1W', '1M', 'ALL']).default('1D'),
  }).optional())
  .query(async ({ ctx, input }) => {
    const window = input?.window ?? '1D'

    // Get most recent snapshot (current value)
    const current = await ctx.db.portfolioSnapshot.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { snapshotAt: 'desc' },
    })
    if (!current) return null

    // Get comparison snapshot based on time window
    const comparisonDate = getComparisonDate(window)
    const previous = comparisonDate
      ? await ctx.db.portfolioSnapshot.findFirst({
          where: {
            userId: ctx.user.id,
            snapshotAt: { lte: comparisonDate },
          },
          orderBy: { snapshotAt: 'desc' },
        })
      : await ctx.db.portfolioSnapshot.findFirst({
          where: { userId: ctx.user.id },
          orderBy: { snapshotAt: 'asc' }, // earliest for ALL
        })

    if (!previous || previous.id === current.id) return null

    const currentIRT = Number(current.totalIRT)
    const previousIRT = Number(previous.totalIRT)
    const deltaIRT = currentIRT - previousIRT
    const deltaPct = previousIRT !== 0
      ? (deltaIRT / previousIRT) * 100
      : 0

    return { currentIRT, previousIRT, deltaIRT, deltaPct }
  })
```

Helper:
```typescript
function getComparisonDate(window: string): Date | null {
  const now = new Date()
  switch (window) {
    case '1D': now.setDate(now.getDate() - 1); return now
    case '1W': now.setDate(now.getDate() - 7); return now
    case '1M': now.setMonth(now.getMonth() - 1); return now
    case 'ALL': return null // handled separately
    default: return null
  }
}
```

### Task A.3.2 — `PortfolioDelta` component

**File:** `src/components/portfolio-delta.tsx` (new)

Renders the delta row below `PortfolioTotal`:

```
+۵۰۰,۰۰۰,۰۰۰ تومان (+۵.۰۰٪)     ← green text
```

- Uses `formatIRT` for the IRT delta
- Formats percentage with `Intl.NumberFormat` (2 decimal places, sign display)
- Color: `text-success` (green) for positive, `text-danger` (red) for negative, `text-muted-foreground` (gray) for zero
- Renders nothing if `data` is `null` (no previous snapshot)

### Task A.3.3 — Time window chips

**File:** `src/components/portfolio-delta.tsx` (extends A.3.2)

A row of chip buttons below the delta value:

```
[ ۱ روز ]  [ ۱ هفته ]  [ ۱ ماه ]  [ از ابتدا ]
```

- Uses HeroUI `Button` with `variant="flat"` / `variant="primary"` for selected state
- Default: `1D` selected
- On chip press: calls `api.portfolio.delta` with the new window, shows loading indicator
- Haptic feedback via `useTelegramHaptics().selectionChanged`

### Task A.3.4 — Integrate delta into My Assets page

**File:** `src/app/(app)/page.tsx` (modified)

Update the hero section:

```tsx
<Section header={tNav('assets')} variant="hero">
  <PortfolioTotal totalIRT={data.totalIRT} />
  <PortfolioDelta userId={user.id} /> {/* NEW */}
  {data.stale && (
    <div className="mt-2">
      <StalenessBanner ... />
    </div>
  )}
</Section>
```

The `PortfolioDelta` component manages its own query state internally — it calls `api.portfolio.delta.useQuery({ window })` and re-fetches when the window changes.

### Task A.3.5 — Handle no-previous-snapshot case

When `portfolio.delta` returns `null`:
- The `PortfolioDelta` component renders nothing (not zero, not an error — simply absent)
- The time window chips are also hidden
- This naturally handles new users who have only one snapshot

---

## 9. Milestone A.4 — Portfolio Value Alerts (P1)

**Goal:** Extend the alert system to trigger on portfolio total value changes.  
**Depends on:** A.1 + A.2

### Task A.4.1 — Extend portfolio cron with PORTFOLIO alert evaluation

**File:** `src/app/api/cron/portfolio/route.ts` (new — see [Section 11](#11-cron-architecture-changes))

After creating portfolio snapshots, evaluate PORTFOLIO alerts:

```typescript
// For each user with a new PortfolioSnapshot:
//   1. Load active PORTFOLIO alerts for that user
//   2. Get previous PortfolioSnapshot (before today's)
//   3. For each alert: check if totalIRT crossed threshold
//   4. Enqueue notifications for triggered alerts
```

### Task A.4.2 — UI: Allow "My Portfolio" as alert target

**File:** `src/components/alerts/create-alert-form.tsx` (modified)

Add a special option at the top of the asset selector:
- "💼 کل دارایی‌ها" (Total Portfolio) — creates an alert with `type: PORTFOLIO`, `symbol: null`
- When selected, the "current price" hint shows the current portfolio total instead

**File:** `src/server/api/routers/alerts.ts` (modified)

Update `alerts.create` to accept `type: 'PORTFOLIO'` with `symbol` as optional/null.

---

## 10. Milestone A.5 — Daily Digest Bot Message (P1)

**Goal:** Opt-in daily summary sent via Telegram bot.  
**Depends on:** A.1 + A.3 (for delta computation)

### Task A.5.1 — Add `dailyDigestEnabled` to User model

**File:** `prisma/schema.prisma`

```prisma
model User {
  id                 String              @id @default(cuid())
  telegramUserId     BigInt              @unique
  dailyDigestEnabled Boolean             @default(false) // NEW
  createdAt          DateTime            @default(now())
  assets             UserAsset[]
  portfolioSnaps     PortfolioSnapshot[]
  alerts             Alert[]
}
```

### Task A.5.2 — Daily digest in portfolio cron

**File:** `src/app/api/cron/portfolio/route.ts` (extends A.4.1)

After portfolio snapshots and alert evaluation:

```typescript
// For each user with dailyDigestEnabled = true:
//   1. Get today's and yesterday's PortfolioSnapshot
//   2. Compute delta (IRT + %)
//   3. Find biggest mover (asset with highest absolute IRT change)
//   4. Send digest message via bot
```

### Task A.5.3 — Digest opt-in toggle UI

**File:** Part of `/alerts` page

A toggle at the top of the alerts settings:

```
Section — "تنظیمات" (Settings)
├── Cell: "خلاصه روزانه" (Daily Digest)
│   ├── Subtitle: "هر صبح خلاصه‌ای از وضعیت دارایی‌هایتان دریافت کنید"
│   └── After: Toggle switch
```

Calls a new `alerts.toggleDigest` procedure (or a `user.updatePreferences` procedure).

---

## 11. Cron Architecture Changes

**Production:** These intervals are implemented with **[cron-job.org](https://cron-job.org)** calling the routes below (not Vercel Cron). See [`docs/cron-scheduling.md`](./cron-scheduling.md).

### Current state (v1)

```
/api/cron/prices (daily at 06:00 UTC)
├── Fetch Ecotrust prices
├── Save PriceSnapshot
├── Prune old PriceSnapshots (90 days)
├── Create PortfolioSnapshot for all active users
└── Prune old PortfolioSnapshots (365 days)
```

### Target state (v2 Phase A)

```
/api/cron/prices (every 30 min, 06:00–22:30 UTC)
├── Fetch Ecotrust prices
├── Save PriceSnapshot
├── Evaluate PRICE alerts (NEW — A.2)
│   ├── Load previous PriceSnapshot
│   ├── Compare prices for all active PRICE alerts
│   ├── Send bot messages for triggered alerts
│   └── Mark triggered alerts as inactive
└── Prune old PriceSnapshots (90 days)

/api/cron/portfolio (NEW — daily at 03:30 UTC, ~07:00 Tehran)
├── Create PortfolioSnapshot for all active users
├── Evaluate PORTFOLIO alerts (A.4 — P1)
├── Send daily digests for opted-in users (A.5 — P1)
└── Prune old PortfolioSnapshots (365 days)
```

### Schedule (cron-job.org; optional `vercel.json` equivalent)

Vercel Cron is not used in production. The expressions below are what you configure in cron-job.org (same paths on your deployed origin):

```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "*/30 6-22 * * *"
    },
    {
      "path": "/api/cron/portfolio",
      "schedule": "30 3 * * *"
    }
  ]
}
```

### New file: `src/app/api/cron/portfolio/route.ts`

Auth pattern identical to price cron (`Authorization: Bearer $CRON_SECRET`).

---

## 12. New tRPC Procedures

| Router | Procedure | Type | Auth | Input | Output |
|---|---|---|---|---|---|
| `alerts` | `list` | query | protected | — | `Alert[]` |
| `alerts` | `create` | mutation | protected | `{ type, symbol?, direction, thresholdIRT }` | `Alert` |
| `alerts` | `toggle` | mutation | protected | `{ id }` | `Alert` |
| `alerts` | `delete` | mutation | protected | `{ id }` | `void` |
| `portfolio` | `delta` | query | protected | `{ window?: '1D' \| '1W' \| '1M' \| 'ALL' }` | `{ deltaIRT, deltaPct } \| null` |

**A.5 addition (P1):**

| Router | Procedure | Type | Auth | Input | Output |
|---|---|---|---|---|---|
| `alerts` | `toggleDigest` | mutation | protected | `{ enabled: boolean }` | `User` |

---

## 13. New i18n Keys

### `fa.json` additions

```json
{
  "nav": {
    "alerts": "هشدارها"
  },
  "alerts": {
    "title": "هشدارهای من",
    "sectionTitle": "هشدارها",
    "create": "ایجاد هشدار",
    "manage": "مدیریت",
    "selectAsset": "دارایی را انتخاب کنید",
    "selectPortfolio": "کل دارایی‌ها",
    "directionAbove": "بالای",
    "directionBelow": "پایین",
    "threshold": "آستانه (تومان)",
    "thresholdPlaceholder": "مثلاً ۱,۵۰۰,۰۰۰",
    "currentPrice": "قیمت فعلی: {price} تومان",
    "createButton": "ایجاد هشدار",
    "activeAlerts": "{count} هشدار فعال",
    "triggeredAlerts": "هشدارهای فعال‌شده",
    "noAlerts": "هنوز هشداری ندارید",
    "noAlertsDescription": "هشدار قیمت بسازید تا هنگام تغییرات مهم بازار مطلع شوید",
    "maxAlertsReached": "حداکثر {max} هشدار فعال مجاز است",
    "deleteTitle": "حذف هشدار",
    "deleteConfirm": "آیا مطمئن هستید؟",
    "delete": "حذف",
    "cancel": "انصراف",
    "toastCreated": "هشدار ایجاد شد",
    "toastCreateError": "خطا در ایجاد هشدار",
    "toastToggled": "هشدار به‌روز شد",
    "toastDeleted": "هشدار حذف شد",
    "toastDeleteError": "خطا در حذف هشدار",
    "reEnable": "فعال‌سازی مجدد",
    "triggered": "فعال شده",
    "triggeredAt": "فعال شده در {time}",
    "above": "بالای {threshold} تومان",
    "below": "پایین {threshold} تومان",
    "dailyDigest": "خلاصه روزانه",
    "dailyDigestDescription": "هر صبح خلاصه‌ای از وضعیت دارایی‌هایتان دریافت کنید",
    "settings": "تنظیمات"
  },
  "delta": {
    "window1D": "۱ روز",
    "window1W": "۱ هفته",
    "window1M": "۱ ماه",
    "windowALL": "از ابتدا"
  }
}
```

Corresponding `en.json` keys follow the same structure with English translations.

---

## 14. Dependency Graph & Task Order

```
A.1.1 Bot sendMessage wrapper
  ↓
A.1.2 Retry logic
  ↓
A.1.3 Notifications queue
  ↓
A.1.4 Message templates
  ↓
A.1.5 Unit tests ←──── A.1.6 Manual smoke test
  ↓
A.2.1 Alert Prisma model ──────────── A.3.1 portfolio.delta tRPC
  ↓                                      ↓
A.2.2 alerts tRPC router             A.3.2 PortfolioDelta component
  ↓                                      ↓
A.2.3 Register in root router        A.3.3 Time window chips
  ↓                                      ↓
A.2.4 Alert evaluation in cron       A.3.4 Integrate into My Assets
  ↓                                      ↓
A.2.5 Evaluation unit tests          A.3.5 No-snapshot edge case
  ↓
A.2.6 Alerts page route
  ↓
A.2.7 CreateAlertForm
  ↓
A.2.8 AlertListItem
  ↓
A.2.9 Alert summary on My Assets
  ↓
A.2.10 Empty state
  ↓
A.4.1 Portfolio alert evaluation (P1)
  ↓
A.4.2 Portfolio as alert target UI (P1)
  ↓
A.5.1 dailyDigestEnabled on User (P1)
  ↓
A.5.2 Digest in portfolio cron (P1)
  ↓
A.5.3 Digest toggle UI (P1)
```

**Parallelism opportunity:** A.3 (Portfolio Delta Banner) is fully independent of A.1/A.2 and can be developed in parallel.

### Suggested implementation order

1. **A.1** (bot infra) — foundation, must be first
2. **A.3** (delta banner) — can start in parallel with A.1; no dependencies
3. **A.2** (price alerts) — depends on A.1; largest milestone
4. **A.4** (portfolio alerts) — P1, depends on A.2
5. **A.5** (daily digest) — P1, depends on A.1 + A.3

---

## 15. Testing Strategy

### Unit tests (Vitest)

| Module | Test file | Key test cases |
|---|---|---|
| `telegram-bot.ts` | `telegram-bot.test.ts` | Send success, retry on failure, complete failure, privacy guard |
| `alert-evaluation.ts` | `alert-evaluation.test.ts` | Edge-trigger logic, symmetric ABOVE/BELOW, no re-trigger, null previous snapshot |
| `alert-messages.ts` | `alert-messages.test.ts` | Template output format, no portfolio values in messages |
| `notifications.ts` | `notifications.test.ts` | Queue enqueue/drain, rate limiting, failure counting |
| `portfolio.delta` | `portfolio-delta.test.ts` | Time window calculations, null handling, percentage computation |

### Integration tests

- **Alert CRUD:** Create, list, toggle, delete alerts via tRPC caller
- **Cron evaluation:** Mock a cron run with price data that triggers an alert; verify bot message is sent and alert is deactivated

### Manual testing

1. **Bot messaging:** Send a test message to a real Telegram user
2. **Alert flow:** Create an alert → wait for cron → verify Telegram message received
3. **Delta banner:** Add assets → create portfolio snapshots → verify delta shows correctly
4. **Edge cases:** New user (no snapshots), user with 10 alerts (limit reached), price that exactly equals threshold

### Commands

```bash
pnpm test                    # Run all unit tests
pnpm typecheck               # TypeScript validation
pnpm lint                    # Biome lint
pnpm check                   # typecheck + lint
```

---

## 16. Definition of Done

### A.1 — Bot Messaging Infrastructure ✅

- [ ] `sendBotMessage` sends a message to a Telegram user within 5 seconds
- [ ] Failed sends are retried once with 2-second delay
- [ ] Failed sends after retry are logged to console
- [ ] Message templates never contain portfolio totals or asset quantities
- [ ] Unit tests pass for all bot messaging functions
- [ ] Manual smoke test: message received in Telegram

### A.2 — Price Alerts ✅

- [ ] `Alert` model exists in Prisma schema with correct indexes
- [ ] User can create a price alert (select asset, direction, threshold)
- [ ] User can view all their alerts (active + triggered)
- [ ] User can toggle an alert on/off
- [ ] User can delete an alert
- [ ] Max 10 active alerts enforced with clear error message
- [ ] Price cron evaluates PRICE alerts after saving snapshot
- [ ] Edge-trigger: alert fires once on threshold crossing, then deactivates
- [ ] Bot message sent within 5 minutes of threshold crossing
- [ ] Alert shows in "triggered" section after firing
- [ ] User can re-enable a triggered alert
- [ ] Empty state shown when no alerts exist
- [ ] Alert summary appears on My Assets page
- [ ] All unit tests pass

### A.3 — Portfolio Delta Banner ✅

- [ ] Delta banner shows `±X IRT (Y%)` below portfolio total
- [ ] Green for positive, red for negative, gray for zero
- [ ] Time window chips: 1D (default), 1W, 1M, All Time
- [ ] Tapping a chip updates the delta value
- [ ] Nothing shown if no previous snapshot exists (new user)
- [ ] `portfolio.delta` tRPC procedure returns correct values
- [ ] All unit tests pass

### A.4 — Portfolio Value Alerts (P1) ✅

- [ ] User can create a "Total Portfolio" alert
- [ ] Portfolio cron evaluates PORTFOLIO alerts after daily snapshot
- [ ] Bot message sent when portfolio total crosses threshold

### A.5 — Daily Digest (P1) ✅

- [ ] User can opt into daily digest from alert settings
- [ ] Daily cron sends digest message to opted-in users
- [ ] Digest contains: total IRT, 24h delta %, top mover name
- [ ] Digest does NOT contain per-asset values or quantities

### Cross-cutting ✅

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] No console errors in development
- [ ] All new i18n keys added to both `fa.json` and `en.json`
- [ ] Conventional commits used throughout

---

## File Change Summary

### New files

| File | Purpose |
|---|---|
| `src/lib/telegram-bot.ts` | Bot API `sendMessage` wrapper with retry |
| `src/lib/notifications.ts` | In-process notification queue |
| `src/lib/alert-messages.ts` | Privacy-safe message templates |
| `src/lib/alert-evaluation.ts` | Price alert evaluation logic |
| `src/server/api/routers/alerts.ts` | Alerts tRPC router (CRUD) |
| `src/app/(app)/alerts/page.tsx` | Alerts management page |
| `src/app/api/cron/portfolio/route.ts` | Daily portfolio cron endpoint |
| `src/components/alerts/create-alert-form.tsx` | Alert creation form |
| `src/components/alerts/alert-list-item.tsx` | Alert list row component |
| `src/components/alerts/alert-summary-card.tsx` | Compact alert summary for My Assets |
| `src/components/portfolio-delta.tsx` | Portfolio delta banner + time chips |
| `src/lib/__tests__/telegram-bot.test.ts` | Bot messaging tests |
| `src/lib/__tests__/alert-evaluation.test.ts` | Alert evaluation tests |
| `src/lib/__tests__/notifications.test.ts` | Notification queue tests |

### Modified files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `Alert` model, `AlertType`/`AlertDir` enums, `dailyDigestEnabled` on `User`, `alerts` relation |
| `src/server/api/root.ts` | Register `alertsRouter` |
| `src/server/api/routers/portfolio.ts` | Add `delta` procedure |
| `src/app/api/cron/prices/route.ts` | Add alert evaluation step, remove portfolio snapshot logic |
| `src/app/(app)/page.tsx` | Add `PortfolioDelta` + `AlertSummaryCard` sections |
| `docs/cron-scheduling.md` | cron-job.org schedules (30 min price, daily portfolio) |
| `messages/fa.json` | Add `alerts`, `delta` namespaces |
| `messages/en.json` | Add `alerts`, `delta` namespaces |
