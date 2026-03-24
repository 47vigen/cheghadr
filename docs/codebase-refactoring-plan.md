# Codebase Refactoring Plan

> **Cheghadr? (چه‌قدر؟)** — Comprehensive refactoring for code clarity, DRY principles, and best practices.
> Scope: structure, database schema, server logic, client architecture, types, i18n, testing, and styling.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Structure Refactoring](#2-project-structure-refactoring)
3. [Database Schema Refactoring](#3-database-schema-refactoring)
4. [Server Layer Refactoring](#4-server-layer-refactoring)
5. [Client Architecture Refactoring](#5-client-architecture-refactoring)
6. [Component Refactoring](#6-component-refactoring)
7. [Type System Refactoring](#7-type-system-refactoring)
8. [Internationalization (i18n) Refactoring](#8-internationalization-i18n-refactoring)
9. [Testing Refactoring](#9-testing-refactoring)
10. [Styling & Theming Refactoring](#10-styling--theming-refactoring)
11. [Dead Code & Dependency Cleanup](#11-dead-code--dependency-cleanup)
12. [Security Hardening](#12-security-hardening)
13. [Migration Strategy](#13-migration-strategy)
14. [Appendix: File Inventory](#appendix-file-inventory)

---

## 1. Executive Summary

After a thorough review of every source file in the codebase, this plan addresses the following systemic issues:


| Category                    | Issue Count | Severity |
| --------------------------- | ----------- | -------- |
| Duplicate functions/logic   | 8           | High     |
| Dead code & unused deps     | 6           | Medium   |
| Structural / file placement | 7           | Medium   |
| Type safety gaps            | 5           | Medium   |
| Missing test coverage       | 5 areas     | High     |
| i18n inconsistencies        | 4           | Low      |
| Naming inconsistencies      | 5           | Low      |
| Security concerns           | 2           | Medium   |


**Guiding principles for this refactoring:**

- **Single source of truth** — Every concept (type, helper, constant, translation key) should be defined exactly once.
- **Colocation** — Files live next to where they are used; shared files go in explicit shared directories.
- **Derive, don't duplicate** — Derive component props from tRPC/Prisma types instead of re-defining them.
- **Explicit over implicit** — No magic. Naming should communicate purpose. Folder structure should communicate architecture.
- **Testable by design** — Extract pure functions from side effects. Inject dependencies.

---

## 2. Project Structure Refactoring

### 2.1 Current Structure (Problems)

```
src/
├── app/                    # ✅ App Router pages — good
├── components/             # ⚠️  Flat dump of 30+ files — no organization
│   ├── alerts/             # ✅ Alert-specific components — good sub-folder
│   ├── skeletons/          # ✅ Loading skeletons — good sub-folder
│   ├── ui/                 # ⚠️  Generic primitives mixed with app-specific
│   └── use-asset-search-groups.ts  # ❌ Hook living in components/
├── hooks/                  # ⚠️  Only Telegram hooks — missing app hooks
├── i18n/                   # ✅ Routing config — fine
├── lib/                    # ⚠️  Mixes pure utils with domain logic with server-side code
├── modules/API/Swagger/    # ⚠️  Deep nesting, only types are actually used
├── server/                 # ✅ Server-side code — good
├── styles/                 # ✅ Global styles — fine
├── trpc/                   # ✅ tRPC client setup — fine
├── types/                  # ⚠️  Only 1 file
└── utils/                  # ⚠️  Overlaps with lib/
```

### 2.2 Proposed Structure

```
src/
├── app/                          # Next.js App Router (unchanged)
│   ├── (app)/                    # Authenticated app shell
│   ├── api/                      # API routes
│   └── login/                    # Login page
│
├── components/
│   ├── assets/                   # Asset-related components
│   │   ├── asset-list-item.tsx
│   │   ├── asset-edit-modal.tsx      # NEW — extracted from asset-list-item
│   │   ├── asset-delete-modal.tsx    # NEW — extracted from asset-list-item
│   │   ├── asset-picker.tsx
│   │   ├── asset-search-panel.tsx
│   │   ├── asset-list-surface.tsx
│   │   └── asset-selector.tsx
│   ├── alerts/                   # Alert-related (unchanged)
│   ├── portfolio/                # Portfolio-related components
│   │   ├── portfolio-breakdown.tsx
│   │   ├── portfolio-chart.tsx
│   │   ├── portfolio-delete-modal.tsx
│   │   ├── portfolio-delta.tsx
│   │   ├── portfolio-form-modal.tsx
│   │   ├── portfolio-selector.tsx
│   │   └── portfolio-total.tsx
│   ├── prices/                   # Price-related components
│   │   ├── price-row.tsx
│   │   ├── price-section.tsx
│   │   ├── staleness-banner.tsx
│   │   └── change-label.tsx
│   ├── layout/                   # App shell / layout components
│   │   ├── bottom-nav.tsx
│   │   ├── page-shell.tsx            # Moved from ui/
│   │   ├── guest-login-banner.tsx
│   │   └── empty-state.tsx
│   ├── skeletons/                # Loading skeletons (unchanged)
│   └── ui/                       # Pure UI primitives (no business logic)
│       ├── async-states.tsx
│       ├── asset-avatar.tsx
│       ├── cell.tsx
│       ├── dynamic-loader.tsx
│       ├── placeholder.tsx
│       └── section.tsx
│
├── hooks/                        # All custom hooks
│   ├── use-asset-search-groups.ts    # Moved from components/
│   ├── use-platform.ts
│   ├── use-pull-to-refresh.ts
│   ├── use-telegram-back-button.ts
│   ├── use-telegram-haptics.ts
│   ├── use-telegram-main-button.ts
│   └── use-viewport-height.ts
│
├── lib/                          # Shared domain logic (pure functions)
│   ├── alerts/                   # Alert domain
│   │   ├── evaluation.ts            # Renamed from alert-evaluation.ts
│   │   ├── messages.ts               # Renamed from alert-messages.ts
│   │   └── utils.ts                  # Renamed from alert-utils.ts
│   ├── prices/                   # Price domain
│   │   ├── format.ts                 # formatIRT, formatChange, formatCompactCurrency
│   │   ├── parse.ts                  # parsePriceSnapshot, findBySymbol, getBaseSymbol
│   │   ├── categories.ts             # categoryOrder, groupByCategory, sortedGroupEntries
│   │   ├── i18n.ts                   # getBilingualAssetLabels, pickDisplayName, etc.
│   │   ├── staleness.ts              # getSnapshotStaleness, STALE_AFTER_MINUTES
│   │   └── index.ts                  # Re-exports all
│   ├── portfolio/                # Portfolio domain
│   │   ├── snapshot.ts               # createPortfolioSnapshot (renamed from portfolio.ts)
│   │   └── biggest-mover.ts          # computeBiggestMover (renamed from portfolio-utils.ts)
│   ├── category-colors.ts
│   ├── csv-download.ts
│   └── notifications.ts
│
├── server/                       # Server-only code
│   ├── api/
│   │   ├── trpc.ts
│   │   ├── root.ts
│   │   ├── helpers.ts                # Consolidated ownership helpers
│   │   └── routers/
│   │       ├── alerts.ts
│   │       ├── assets.ts
│   │       ├── portfolio.ts
│   │       ├── prices.ts
│   │       └── user.ts
│   ├── auth/
│   │   ├── config.ts
│   │   └── telegram.ts
│   ├── cron/                     # NEW — Extracted cron logic from route handlers
│   │   ├── auth.ts                   # Shared cron auth helper
│   │   ├── price-snapshot.ts         # Price cron business logic
│   │   └── portfolio-snapshot.ts     # Portfolio cron business logic
│   └── db.ts
│
├── providers/                    # NEW — All React context providers
│   ├── client-root.tsx               # Moved from components/
│   ├── client-root-wrapper.tsx       # Moved from components/
│   ├── client-providers.tsx          # Moved from components/
│   ├── locale-provider.tsx           # Moved from components/
│   └── telegram-provider.tsx         # Moved from components/
│
├── trpc/                         # tRPC client setup (unchanged)
├── i18n/                         # i18n config (unchanged)
├── styles/                       # Styles (unchanged)
├── types/                        # Shared TypeScript types
│   ├── telegram.d.ts
│   └── api.ts                    # NEW — tRPC-derived types for components
└── env.js                        # Environment validation
```

### 2.3 Key Changes Explained


| Change                                                                     | Rationale                                                                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Group components by domain (`assets/`, `portfolio/`, `prices/`, `layout/`) | Flat folder with 30+ files is hard to navigate. Domain grouping makes ownership clear.                     |
| Move providers to `src/providers/`                                         | Providers are not UI components — they are app infrastructure. Separating them prevents confusion.         |
| Move `use-asset-search-groups.ts` to `hooks/`                              | Hooks should live in `hooks/`, not `components/`.                                                          |
| Split `lib/prices.ts` (220 lines) into sub-modules                         | The file mixes parsing, formatting, i18n, staleness, and category logic. Each concern gets its own module. |
| Group `lib/alert-*.ts` into `lib/alerts/`                                  | Three related files scattered at the lib root — they belong together.                                      |
| Extract cron business logic to `server/cron/`                              | Route handlers (`app/api/cron/`) should be thin wrappers. Business logic belongs in `server/cron/`.        |
| Remove `src/modules/API/` deep nesting                                     | Only the generated types from `Swagger/ecotrust/gen/models/` are used. Flatten or alias properly.          |
| Create `types/api.ts` for tRPC-derived types                               | Components currently re-define types that could be inferred from tRPC output.                              |


### 2.4 Remove `src/modules/API/Swagger` Deep Nesting

The current path `src/modules/API/Swagger/ecotrust/gen/models/` is 6 levels deep. Only the type files are used (imported by `lib/prices.ts`). The Kubb config, JSON schemas, and `index.ts` barrel files are artifacts.

**Proposal**: Move used types to `src/types/ecotrust.ts` (a single barrel file) or keep the generated folder but flatten to `src/generated/ecotrust/`. Update the `@Swagger/`* tsconfig path alias or remove it (it's currently unused — code uses `@/modules/API/...` instead).

---

## 3. Database Schema Refactoring

### 3.1 Current Schema Issues

```prisma
// ❌ datasource block has no url — relies on implicit env convention
datasource db {
  provider = "postgresql"
  // Missing: url = env("DATABASE_URL")
}

// ❌ User has no updatedAt
model User {
  id                 String              @id @default(cuid())
  telegramUserId     BigInt              @unique
  dailyDigestEnabled Boolean             @default(false)
  preferredLocale    PreferredLocale     @default(en)
  createdAt          DateTime            @default(now())
  // Missing: updatedAt DateTime @updatedAt
}
```

### 3.2 Schema Changes

#### 3.2.1 Add Explicit Datasource URL

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

This makes the configuration explicit and self-documenting. Prisma 7 may infer the URL from `DATABASE_URL`, but explicit is always better.

#### 3.2.2 Add `updatedAt` to User

```prisma
model User {
  id                 String              @id @default(cuid())
  telegramUserId     BigInt              @unique
  dailyDigestEnabled Boolean             @default(false)
  preferredLocale    PreferredLocale     @default(en)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt        // NEW
  // ... relations
}
```

Currently, when `dailyDigestEnabled` or `preferredLocale` changes, there's no record of when the User was last modified. This is standard practice.

#### 3.2.3 Rename `portfolioSnaps` to `portfolioSnapshots`

```prisma
model User {
  // ...
  portfolioSnapshots PortfolioSnapshot[]   // Was: portfolioSnaps
}
```

Abbreviations are inconsistent. `Portfolio.snapshots` is already the full word. User should match.

#### 3.2.4 Add Composite Index for PortfolioSnapshot

```prisma
model PortfolioSnapshot {
  // ...
  @@index([userId, portfolioId, snapshotAt(sort: Desc)])  // NEW — common query pattern
}
```

The `portfolio.delta` and `portfolio.history` procedures filter by `userId + portfolioId + snapshotAt`. A composite index covers these queries efficiently.

#### 3.2.5 Consider Typed JSON with Zod

`PriceSnapshot.data` and `PortfolioSnapshot.breakdown` are untyped `Json` fields. While not a schema change, add Zod validation when reading from DB:

```typescript
const breakdownSchema = z.array(z.object({
  symbol: z.string(),
  quantity: z.number(),
  valueIRT: z.number(),
}))

// In router:
const items = breakdownSchema.parse(latestSnap.breakdown)
```

This catches data corruption early instead of failing silently.

#### 3.2.6 Full Proposed Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum AlertType {
  PRICE
  PORTFOLIO
}

enum AlertDir {
  ABOVE
  BELOW
}

enum PreferredLocale {
  en
  fa
}

model User {
  id                   String              @id @default(cuid())
  telegramUserId       BigInt              @unique
  dailyDigestEnabled   Boolean             @default(false)
  preferredLocale      PreferredLocale     @default(en)
  createdAt            DateTime            @default(now())
  updatedAt            DateTime            @updatedAt

  assets               UserAsset[]
  portfolios           Portfolio[]
  portfolioSnapshots   PortfolioSnapshot[]
  alerts               Alert[]
}

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

model UserAsset {
  id          String    @id @default(cuid())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  portfolio   Portfolio @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String
  symbol      String
  quantity    Decimal   @db.Decimal(24, 8)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([userId, symbol, portfolioId])
  @@index([userId])
  @@index([portfolioId])
}

model PriceSnapshot {
  id         String   @id @default(cuid())
  snapshotAt DateTime @default(now())
  data       Json

  @@index([snapshotAt(sort: Desc)])
}

model PortfolioSnapshot {
  id          String     @id @default(cuid())
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId      String
  portfolio   Portfolio? @relation(fields: [portfolioId], references: [id], onDelete: Cascade)
  portfolioId String?
  snapshotAt  DateTime   @default(now())
  totalIRT    Decimal    @db.Decimal(24, 2)
  breakdown   Json

  @@index([userId, snapshotAt(sort: Desc)])
  @@index([portfolioId, snapshotAt(sort: Desc)])
  @@index([userId, portfolioId, snapshotAt(sort: Desc)])
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

---

## 4. Server Layer Refactoring

### 4.1 Consolidate Ownership Helpers (DRY Violation)

**Problem**: Three nearly identical `requireOwned`* functions exist in three separate files:


| Function                | File                                   |
| ----------------------- | -------------------------------------- |
| `requireOwnedPortfolio` | `server/api/helpers.ts`                |
| `requireOwnedAsset`     | `server/api/routers/assets.ts` (local) |
| `requireOwnedAlert`     | `server/api/routers/alerts.ts` (local) |


All follow the same pattern: find by ID → check userId → throw NOT_FOUND.

**Solution**: Create a generic ownership helper in `server/api/helpers.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

type OwnableModel = 'portfolio' | 'userAsset' | 'alert'

export async function requireOwned<T extends OwnableModel>(
  db: PrismaClient,
  model: T,
  id: string,
  userId: string,
) {
  const record = await (db[model] as any).findUnique({ where: { id } })
  if (!record || record.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  return record
}

// Type-safe convenience wrappers
export const requireOwnedPortfolio = (db: PrismaClient, id: string, userId: string) =>
  requireOwned(db, 'portfolio', id, userId)

export const requireOwnedAsset = (db: PrismaClient, id: string, userId: string) =>
  requireOwned(db, 'userAsset', id, userId)

export const requireOwnedAlert = (db: PrismaClient, id: string, userId: string) =>
  requireOwned(db, 'alert', id, userId)
```

Then remove the local duplicates from `assets.ts` and `alerts.ts`.

### 4.2 Consolidate Validation Schemas (DRY Violation)

**Problem**: `quantitySchema` (assets.ts) and `thresholdSchema` (alerts.ts) are identical — both validate "positive number string".

**Solution**: Extract to `server/api/helpers.ts`:

```typescript
export const positiveDecimalStringSchema = z.string().refine(
  (v) => {
    const n = Number(v)
    return !Number.isNaN(n) && n > 0
  },
  { message: 'مقدار باید عددی مثبت باشد' },
)
```

Use it in both routers with custom messages if needed:

```typescript
// In assets.ts
quantity: positiveDecimalStringSchema,

// In alerts.ts  
thresholdIRT: positiveDecimalStringSchema,
```

### 4.3 Extract Cron Auth to Shared Helper (DRY Violation)

**Problem**: Both cron routes (`/api/cron/prices` and `/api/cron/portfolio`) duplicate the same CRON_SECRET authentication logic (~10 lines each).

**Solution**: Create `server/cron/auth.ts`:

```typescript
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function verifyCronAuth(request: NextRequest):
  | { authorized: true }
  | { authorized: false; response: NextResponse } {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not configured')
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { authorized: true }
}
```

Usage in route handlers:

```typescript
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response
  // ... business logic
}
```

### 4.4 Extract Cron Business Logic from Route Handlers

**Problem**: `app/api/cron/portfolio/route.ts` is 235 lines of business logic crammed into a route handler. It handles:

- Portfolio snapshot creation for all users
- Portfolio alert evaluation
- Daily digest messages
- Notification sending
- Snapshot pruning

**Solution**: Extract into `server/cron/portfolio-snapshot.ts`:

```typescript
// server/cron/portfolio-snapshot.ts
export async function runPortfolioCron(db: PrismaClient): Promise<CronResult> {
  const snapshots = await createAllPortfolioSnapshots(db)
  const alerts = await evaluatePortfolioAlerts(db)
  const digests = await sendDailyDigests(db)
  const pruned = await pruneOldSnapshots(db)
  return { snapshots, alerts, digests, pruned }
}
```

The route handler becomes a thin wrapper:

```typescript
export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response
  const result = await runPortfolioCron(db)
  return NextResponse.json({ success: true, ...result })
}
```

This makes the cron logic unit-testable without HTTP overhead.

### 4.5 Extract `toAlertMessageLocale` (DRY Violation)

**Problem**: `toAlertMessageLocale` is duplicated in:

- `lib/alert-evaluation.ts` (line 15)
- `app/api/cron/portfolio/route.ts` (line 21)

**Solution**: Move to `lib/alerts/messages.ts` (already the natural home):

```typescript
// lib/alerts/messages.ts
export function toAlertMessageLocale(loc: 'en' | 'fa'): AlertMessageLocale {
  return loc === 'en' ? 'en' : 'fa'
}
```

### 4.6 Extract `refreshPortfolioSnapshots` Helper (DRY Violation)

**Problem**: After every asset mutation (add, update, delete), the same two snapshot calls are made:

```typescript
void createPortfolioSnapshot(ctx.db, ctx.user.id, input.portfolioId)
void createPortfolioSnapshot(ctx.db, ctx.user.id, null)
```

This pattern appears 3 times in `assets.ts` and once in `portfolio.ts`.

**Solution**: Extract to a helper:

```typescript
// server/api/helpers.ts
export function refreshPortfolioSnapshots(
  db: PrismaClient,
  userId: string,
  portfolioId: string | null,
) {
  if (portfolioId) {
    void createPortfolioSnapshot(db, userId, portfolioId)
  }
  void createPortfolioSnapshot(db, userId, null)
}
```

### 4.7 Move Digest Settings to User Router

**Problem**: `alerts.settings` and `alerts.toggleDigest` are user-level settings living in the alerts router.

**Solution**: Move to `userRouter`:

```typescript
// server/api/routers/user.ts
export const userRouter = router({
  setPreferredLocale: protectedProcedure.input(...).mutation(...),
  getSettings: protectedProcedure.query(...),        // Moved from alerts.settings
  toggleDailyDigest: protectedProcedure.input(...).mutation(...), // Moved from alerts.toggleDigest
})
```

### 4.8 Use `FORBIDDEN` for Ownership Violations

**Problem**: All ownership checks throw `NOT_FOUND` even when the resource exists but belongs to another user. This makes debugging harder for developers and hides authorization issues.

**Solution**: Use `FORBIDDEN` when the record exists but the userId doesn't match:

```typescript
export async function requireOwned(...) {
  const record = await (db[model] as any).findUnique({ where: { id } })
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  if (record.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' })
  }
  return record
}
```

### 4.9 Remove Unused `createCaller`

**Problem**: `server/api/root.ts` exports `createCaller` but it's never imported anywhere.

**Solution**: Remove it. If server-side tRPC calling is needed in the future, it can be re-added.

---

## 5. Client Architecture Refactoring

### 5.1 Break Up the Assets Page (410 Lines)

**Problem**: `app/(app)/page.tsx` is the largest component in the codebase at 410 lines. It handles:

- Portfolio selector + CRUD modals
- Asset list with category filtering
- Portfolio chart, breakdown, delta
- Alert summary
- CSV export
- Pull-to-refresh
- FAB button

**Solution**: Extract into sub-components:

```
app/(app)/page.tsx  (orchestrator — ~100 lines)
├── components/assets/assets-hero-section.tsx     (portfolio selector + total + delta + staleness)
├── components/assets/assets-chart-section.tsx     (chart + period selector)
├── components/assets/assets-breakdown-section.tsx (breakdown pie + biggest mover)
├── components/assets/assets-list-section.tsx      (category filter + asset list)
├── components/assets/assets-alert-summary.tsx     (alert CTA card)
└── components/assets/assets-fab.tsx               (floating add button)
```

Each section receives data via props from the page-level queries. The page becomes a pure orchestrator.

### 5.2 Move Provider Components to `providers/`

**Problem**: `client-root.tsx`, `client-root-wrapper.tsx`, `client-providers.tsx`, `locale-provider.tsx`, and `telegram-provider.tsx` are React context providers living in `components/`. They are not UI components.

**Solution**: Move all 5 files to `src/providers/`. Update imports in `app/layout.tsx`.

### 5.3 Derive Props from tRPC Types

**Problem**: Components re-define types that already exist as tRPC output types:


| Component            | Local Type                                           | Should Derive From                                  |
| -------------------- | ---------------------------------------------------- | --------------------------------------------------- |
| `PortfolioSelector`  | `Portfolio { id, name, emoji, assetCount }`          | `RouterOutputs['portfolio']['list'][number]`        |
| `PortfolioFormModal` | `{ id: string; name: string; emoji: string | null }` | Same                                                |
| `AssetListItem`      | `AssetListItemProps`                                 | `RouterOutputs['assets']['list']['assets'][number]` |


**Solution**: Create `types/api.ts`:

```typescript
import type { AppRouter } from '@/server/api/root'
import type { inferRouterOutputs } from '@trpc/server'

type RouterOutputs = inferRouterOutputs<AppRouter>

export type PortfolioListItem = RouterOutputs['portfolio']['list'][number]
export type AssetListEntry = RouterOutputs['assets']['list']['assets'][number]
export type AlertEntry = RouterOutputs['alerts']['list'][number]
export type PriceLatest = RouterOutputs['prices']['latest']
```

Components import from `types/api.ts` instead of defining their own interfaces.

### 5.4 Consolidate `AssetListGroup` Interface (DRY Violation)

**Problem**: `AssetListGroup` is defined identically in:

- `components/asset-search-panel.tsx` (line 12)
- `components/asset-list-surface.tsx` (line 15)

**Solution**: Define once in `asset-list-surface.tsx` (the lower-level component) and export. `asset-search-panel.tsx` imports it:

```typescript
// asset-list-surface.tsx
export interface AssetListGroup {
  category: string
  categoryLabel: string
  items: PriceItem[]
}
```

### 5.5 Narrow Query Persistence (Data Leak Risk)

**Problem**: `shouldDehydrateQuery: () => true` in `query-client.ts` persists ALL queries to localStorage, including user-specific data. Combined with `gcTime: Infinity`, stale user data can persist across sessions.

**Solution**:

```typescript
shouldDehydrateQuery: (query) => {
  // Only persist non-mutation, non-user-specific queries
  const key = query.queryKey[0] as string[] | undefined
  const procedure = key?.[1]
  // Don't persist sensitive or user-specific data
  const sensitiveKeys = ['alerts', 'portfolio', 'assets', 'user']
  if (procedure && sensitiveKeys.includes(procedure)) return false
  return defaultShouldDehydrateQuery(query)
},
```

### 5.6 Only Persist Locale on Explicit Change

**Problem**: `LocaleProvider` calls `persistPreferredLocale({ locale })` on every locale change via `useEffect`. On first load, this persists the auto-detected locale, causing an unnecessary DB write.

**Solution**: Track whether the locale change was user-initiated:

```typescript
const [userExplicitlyChanged, setUserExplicitlyChanged] = useState(false)

useEffect(() => {
  if (!userExplicitlyChanged) return
  persistPreferredLocale({ locale })
}, [locale, userExplicitlyChanged])
```

---

## 6. Component Refactoring

### 6.1 Extract Modals from `AssetListItem` (235 Lines)

**Problem**: `AssetListItem` contains two complete modal components inline (edit modal + delete modal), making it 235 lines. The modals have their own state and mutation logic.

**Solution**: Extract into dedicated components:

```typescript
// components/assets/asset-edit-modal.tsx
export function AssetEditModal({ asset, isOpen, onClose }: Props) { ... }

// components/assets/asset-delete-modal.tsx
export function AssetDeleteModal({ asset, isOpen, onClose }: Props) { ... }
```

`AssetListItem` shrinks to ~80 lines — just the list item UI with modal triggers.

### 6.2 Add Accessibility to `BottomNav`

**Problem**: Tab buttons in `BottomNav` lack `aria-label` and `aria-current` attributes.

**Solution**:

```tsx
<button
  key={id}
  type="button"
  aria-label={t(labelKey)}
  aria-current={isSelected ? 'page' : undefined}
  role="tab"
  onClick={() => { ... }}
>
```

### 6.3 Unify `EmptyState` vs `EmptyStateBase`

**Problem**: Two empty state components exist with unclear usage guidelines:

- `EmptyState` (in `components/empty-state.tsx`) — assets-specific, with icon and action button
- `EmptyStateBase` (in `components/ui/async-states.tsx`) — generic, used by prices, calculator, add-asset

**Solution**: Rename for clarity:


| Current          | Proposed           | Purpose                                        |
| ---------------- | ------------------ | ---------------------------------------------- |
| `EmptyState`     | `AssetsEmptyState` | Assets-specific (move to `components/assets/`) |
| `EmptyStateBase` | `EmptyState`       | The generic reusable component                 |


### 6.4 Consistent Prop Naming

**Problem**: Event handler props use inconsistent names:


| Component            | Current          | Convention     |
| -------------------- | ---------------- | -------------- |
| `AssetSearchPanel`   | `onSearchChange` | `onSearch`     |
| `AssetSelector`      | `onChange`       | `onSelect`     |
| `PortfolioFormModal` | `onClose`        | `onClose` (OK) |


**Solution**: Standardize:

- Selection events: `onSelect`
- Change events: `onChange`
- Close/dismiss events: `onClose`
- Search input: `onSearchChange` (keep — it's a controlled input change)

### 6.5 Remove `ListRowSkeleton` from `ui/`

**Problem**: `components/ui/list-row-skeleton.tsx` exports `ListRowSkeleton`, which is only imported by `components/skeletons/skeleton-primitives.tsx`.

**Solution**: Move `ListRowSkeleton` into `skeleton-primitives.tsx` where it's already conceptually grouped. Remove `ui/list-row-skeleton.tsx`.

---

## 7. Type System Refactoring

### 7.1 Eliminate `any` Usage


| File                                   | Current                              | Fix                                                                                                |
| -------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `components/guest-login-banner.tsx:27` | `router.push(... as any)`            | Use proper typed route: `router.push({ pathname: '/login', query: { callbackUrl: encodedPath } })` |
| `app/login/page.tsx:22`                | `... as any`                         | Same pattern — cast to typed route                                                                 |
| `components/asset-picker.tsx`          | `priceData: unknown`                 | Type as `PriceItem[]` or `PricesResponse`                                                          |
| `server/api/trpc.ts:28`                | `session as Record<string, unknown>` | Extend NextAuth types (see 7.2)                                                                    |


### 7.2 Extend NextAuth Types

**Problem**: The session type doesn't include `telegramUserId`, forcing unsafe casts.

**Solution**: Create `types/next-auth.d.ts`:

```typescript
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    telegramUserId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    telegramUserId?: string
  }
}
```

Then in `trpc.ts`, replace:

```typescript
const sessionAny = session as Record<string, unknown>
const rawId = sessionAny?.telegramUserId
```

With:

```typescript
const rawId = session?.telegramUserId
```

### 7.3 Type JSON Fields with Zod Schemas

Create shared Zod schemas for JSON fields in `types/schemas.ts`:

```typescript
import { z } from 'zod'

export const breakdownItemSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  valueIRT: z.number(),
})

export const breakdownSchema = z.array(breakdownItemSchema)

export type BreakdownItem = z.infer<typeof breakdownItemSchema>
```

Use in routers instead of inline `type BreakdownItem = { ... }` casts (currently duplicated in `portfolio.ts` line 262 and `cron/portfolio/route.ts` line 170).

---

## 8. Internationalization (i18n) Refactoring

### 8.1 Remove Duplicate Translation Keys

**Problem**: `assets` and `common` namespaces both define the same keys:


| Key                         | In `assets` | In `common` |
| --------------------------- | ----------- | ----------- |
| `sessionExpired`            | ✅           | ✅           |
| `sessionExpiredDescription` | ✅           | ✅           |
| `reLogin`                   | ✅           | ✅           |
| `connectionError`           | ✅           | ✅           |


**Solution**: Remove from `assets`, keep only in `common`. Components that currently use `t('sessionExpired')` from the `assets` namespace should use `tCommon('sessionExpired')` instead.

### 8.2 Remove Unused `nav.alerts` Key

**Problem**: `nav.alerts` exists in both `en.json` and `fa.json`, but there's no Alerts tab in `BottomNav`. The alerts page is accessed via the summary card on the assets page.

**Solution**: Either:

- **Option A**: Remove `nav.alerts` from both message files.
- **Option B**: Add an Alerts tab to `BottomNav` (if planned).

Recommend **Option A** unless an alerts tab is on the roadmap.

### 8.3 Parameterize Chart Period Keys

**Problem**: Separate keys for each chart period:

```json
"chartPeriod7": "7D",
"chartPeriod30": "30D",
"chartPeriod90": "90D",
"chartPeriod365": "1Y"
```

**Solution**: Use ICU message format with parameter:

```json
"chartPeriod": "{period}"
```

Or since these are short labels that don't really need translation, consider keeping them as constants in code.

### 8.4 Consistent Key Naming Pattern

Establish and document a convention:

```
{namespace}.{action/noun}{Qualifier}
```

Examples:

- `assets.toastUpdated` → `assets.toast.updated`
- `assets.toastUpdateError` → `assets.toast.updateError`
- `assets.editTitle` → `assets.edit.title`
- `assets.editQuantityHeader` → `assets.edit.quantityLabel`

This groups related keys and makes the structure predictable. Apply across all namespaces.

---

## 9. Testing Refactoring

### 9.1 Current Coverage Assessment


| Area                      | Has Tests? | Quality                                       |
| ------------------------- | ---------- | --------------------------------------------- |
| `lib/prices.ts`           | ✅          | Good — covers parsing, formatting, edge cases |
| `lib/portfolio.ts`        | ✅          | Good — covers snapshot creation logic         |
| `lib/portfolio-utils.ts`  | ✅          | Good — covers biggest mover calculation       |
| `lib/alert-evaluation.ts` | ✅          | Good — covers threshold crossing              |
| `lib/alert-messages.ts`   | ✅          | Good — covers localized messages              |
| `lib/notifications.ts`    | ✅          | Good — covers queue drain                     |
| `server/auth/telegram.ts` | ✅          | Good — covers HMAC validation                 |
| tRPC routers              | ❌          | No tests                                      |
| Components                | ❌          | No tests                                      |
| Cron routes               | ❌          | No tests                                      |
| E2E flows                 | ❌          | No tests                                      |


### 9.2 Priority Test Additions

#### P0: tRPC Router Tests

The routers are the core business logic and have zero tests. Add integration tests for each router:

```
src/server/api/routers/__tests__/
├── assets.test.ts
├── alerts.test.ts
├── portfolio.test.ts
├── prices.test.ts
└── user.test.ts
```

Each test should use a Prisma mock or test database to verify:

- Input validation (invalid inputs are rejected)
- Authorization (ownership checks work)
- Business logic (correct data is returned/mutated)
- Edge cases (empty data, missing snapshots, max limits)

#### P1: Cron Logic Tests

After extracting cron business logic to `server/cron/`:

```
src/server/cron/__tests__/
├── price-snapshot.test.ts
├── portfolio-snapshot.test.ts
└── auth.test.ts
```

#### P2: Component Tests

Prioritize components with complex interaction logic:

```
src/components/__tests__/
├── asset-list-item.test.tsx    (edit + delete modals)
├── create-alert-form.test.tsx  (form validation)
├── portfolio-form-modal.test.tsx
└── bottom-nav.test.tsx         (navigation)
```

### 9.3 Test Infrastructure

#### Add Test Utilities File

```typescript
// src/test-utils.ts
import { createTRPCMsw } from 'msw-trpc'
import type { AppRouter } from '@/server/api/root'

export const trpcMsw = createTRPCMsw<AppRouter>()

// Shared test fixtures
export const mockUser = { id: 'test-user', telegramUserId: 123456789n }
export const mockPortfolio = { id: 'test-portfolio', name: 'Test', emoji: '📊' }
```

#### Add Missing Tests for Untested Lib Functions

```
src/lib/__tests__/
├── csv-download.test.ts    (NEW)
├── category-colors.test.ts (NEW)
```

---

## 10. Styling & Theming Refactoring

### 10.1 Convert Custom CSS to Tailwind Where Possible

Several CSS classes in `globals.css` use `@apply` extensively and could be replaced with utility classes:


| Class             | Current                            | Proposed                                                                 |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| `.section-header` | Custom font-family, size, tracking | Tailwind `font-display text-sm tracking-wide font-medium uppercase`      |
| `.label-compact`  | Similar pattern                    | Tailwind `font-display text-[10px] tracking-wider font-medium uppercase` |
| `.modal-body`     | `@apply flex flex-col gap-4 p-4`   | Inline in component JSX                                                  |


Keep custom CSS only for things Tailwind cannot express (CSS variables, complex keyframes).

### 10.2 Verify Unused CSS Classes

Audit these potentially unused classes:

- `.error-text` — verify usage; remove if dead
- Focus ring styles — ensure `focus:ring-primary` maps to theme correctly

### 10.3 Document Theme Variable Contract

Create a comment block at the top of `elegant.css` documenting the variable contract:

```css
/*
 * Theme Variable Contract
 * These variables MUST be defined for both light and dark modes:
 *
 * Colors: --background, --foreground, --surface, --surface-elevated,
 *         --border, --accent, --accent-foreground, --muted, --muted-foreground,
 *         --destructive, --warning
 *
 * Cards: --card, --card-elevated (aliases for --surface variants)
 *
 * Sizes: --tabbar-height, --section-label-size, --section-label-tracking,
 *        --bottom-above-tabbar
 */
```

---

## 11. Dead Code & Dependency Cleanup

### 11.1 Dead Code to Remove


| Item                             | File                                                  | Status                                                |
| -------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `useTelegramMainButton` hook     | `hooks/use-telegram-main-button.ts`                   | Never imported. Remove or wire into `AssetPicker`.    |
| `createCaller` export            | `server/api/root.ts`                                  | Never imported. Remove.                               |
| `@tanstack/react-query-devtools` | `package.json` + commented import in `trpc/react.tsx` | Either enable in dev or remove the dependency.        |
| `@Swagger/*` path alias          | `tsconfig.json`                                       | Never used (code uses `@/modules/API/...`). Remove.   |
| `eslint.config.mjs`              | Root                                                  | Project uses Biome, not ESLint. Remove if not needed. |


### 11.2 Potentially Unused Dependencies

Run `pnpm why <pkg>` to verify:


| Package                        | Used?                                                    | Action                                     |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------ |
| `lodash-es`                    | No direct imports in `src/`                              | Remove if not a transitive requirement     |
| `date-fns` + `date-fns-jalali` | No direct imports in `src/`                              | Remove if only in `optimizePackageImports` |
| `tailwind-variants`            | No direct imports in `src/`                              | Likely used by HeroUI internally — keep    |
| `ua-parser-js`                 | Used in `use-platform.ts`                                | Keep                                       |
| `@twa-dev/sdk`                 | Used in `csv-download.ts`, `use-telegram-main-button.ts` | Keep                                       |


### 11.3 Remove `eslint.config.mjs`

The project uses Biome for linting (`pnpm lint` runs `biome lint .`). The ESLint config appears to be a leftover. Verify no CI or tools depend on it, then remove.

---

## 12. Security Hardening

### 12.1 Add Production Guard for Dev Bypass

**Problem**: `DEV_TELEGRAM_USER_ID` bypass in `proxy.ts` and `trpc.ts` checks `NODE_ENV === 'development'`, but this relies on the deployment platform correctly setting `NODE_ENV`. A misconfiguration could expose the bypass in production.

**Solution**: Add double protection:

```typescript
// In proxy.ts and trpc.ts
const isDevBypassAllowed =
  process.env.NODE_ENV === 'development' &&
  !process.env.VERCEL &&  // Never on Vercel
  process.env.DEV_TELEGRAM_USER_ID

if (!telegramUserId && isDevBypassAllowed) {
  telegramUserId = BigInt(process.env.DEV_TELEGRAM_USER_ID!)
}
```

### 12.2 Use `FORBIDDEN` Consistently

As noted in 4.8, ownership violations should return `FORBIDDEN` (not `NOT_FOUND`) to prevent information leakage about resource existence while still providing correct HTTP semantics for authorization failures.

---

## 13. Migration Strategy

### Phase A: Foundation (Low Risk)

1. **Schema changes** — Add `updatedAt` to User, add composite index, add explicit datasource URL, rename `portfolioSnaps` → `portfolioSnapshots`. Run `prisma migrate dev`.
2. **Extract shared helpers** — Move ownership helpers, validation schemas, cron auth to shared files. Pure refactoring, no behavior change.
3. **Move alert settings to user router** — Move `alerts.settings` and `alerts.toggleDigest` to `userRouter`.
4. **Remove dead code** — Delete `useTelegramMainButton` (or wire it in), remove `createCaller`, clean up unused deps.
5. **Fix types** — Add NextAuth type extensions, create `types/api.ts` with tRPC-derived types. Remove `@Swagger/*` alias from `tsconfig.json` and `biome.json`.
6. **Security** — Add production guard for dev bypass in `proxy.ts` and `trpc.ts`.

### Phase B: Structure (Medium Risk)

1. **Move providers** — Create `src/providers/`, move all 5 provider files. Update imports.
2. **Reorganize components** — Create domain sub-folders (`assets/`, `portfolio/`, `prices/`, `layout/`, `calculator/`). Move files. Update imports.
3. **Split `lib/prices.ts`** — Extract into sub-modules. Keep `index.ts` barrel for backward compat during migration.
4. **Group `lib/alert-*.ts`** — Move into `lib/alerts/` directory.

### Phase C: Components (Medium Risk)

1. **Extract modals from `AssetListItem`** — Create `AssetEditModal` and `AssetDeleteModal`.
2. **Break up Assets page** — Extract section components from the 410-line page.
3. **Add accessibility** — `aria-label`, `aria-current` to `BottomNav` and other components.
4. **Fix i18n duplicates** — Remove duplicate keys from `assets` namespace.

### Phase D: Testing (Low Risk)

1. **Add tRPC router tests** — Cover all routers with integration tests.
2. **Add cron logic tests** — After extracting to `server/cron/`.
3. **Add missing lib tests** — `csv-download.test.ts`, `category-colors.test.ts`.

### Phase E: Polish (Low Risk)

1. **Narrow query persistence** — Only persist non-sensitive queries. Align `query-client.ts` dehydrate options with `persister.ts`.
2. **CSS cleanup** — Convert applicable custom CSS to Tailwind utilities.
3. **Documentation** — Update README, AGENTS.md with new structure.

### Risk Assessment


| Phase         | Risk   | Files Changed               | Breaking?             |
| ------------- | ------ | --------------------------- | --------------------- |
| A: Foundation | Low    | ~15                         | DB migration required |
| B: Structure  | Medium | ~40 (mostly import updates) | No behavior change    |
| C: Components | Medium | ~15                         | No behavior change    |
| D: Testing    | Low    | New files only              | No behavior change    |
| E: Polish     | Low    | ~10                         | No behavior change    |


---

## Appendix: File Inventory

### Files to Delete


| File                                      | Reason                                       |
| ----------------------------------------- | -------------------------------------------- |
| `src/hooks/use-telegram-main-button.ts`   | Unused hook (or wire into AssetPicker first) |
| `src/components/ui/list-row-skeleton.tsx` | Merge into `skeleton-primitives.tsx`         |
| `eslint.config.mjs`                       | Project uses Biome, not ESLint               |


### Files to Move


| From                                        | To                                                 | Reason                  |
| ------------------------------------------- | -------------------------------------------------- | ----------------------- |
| `src/components/client-root.tsx`            | `src/providers/client-root.tsx`                    | Not a UI component      |
| `src/components/client-root-wrapper.tsx`    | `src/providers/client-root-wrapper.tsx`            | Not a UI component      |
| `src/components/client-providers.tsx`       | `src/providers/client-providers.tsx`               | Not a UI component      |
| `src/components/locale-provider.tsx`        | `src/providers/locale-provider.tsx`                | Not a UI component      |
| `src/components/telegram-provider.tsx`      | `src/providers/telegram-provider.tsx`              | Not a UI component      |
| `src/components/use-asset-search-groups.ts` | `src/hooks/use-asset-search-groups.ts`             | Hook in wrong directory |
| `src/components/portfolio-*.tsx`            | `src/components/portfolio/*.tsx`                   | Domain grouping         |
| `src/components/asset-*.tsx`                | `src/components/assets/*.tsx`                      | Domain grouping         |
| `src/components/price-*.tsx`                | `src/components/prices/*.tsx`                      | Domain grouping         |
| `src/components/staleness-banner.tsx`       | `src/components/prices/staleness-banner.tsx`       | Domain grouping         |
| `src/components/change-label.tsx`           | `src/components/prices/change-label.tsx`           | Domain grouping         |
| `src/components/bottom-nav.tsx`             | `src/components/layout/bottom-nav.tsx`             | Layout component        |
| `src/components/empty-state.tsx`            | `src/components/assets/assets-empty-state.tsx`     | Domain-specific         |
| `src/components/guest-login-banner.tsx`     | `src/components/layout/guest-login-banner.tsx`     | Layout component        |
| `src/components/ui/page-shell.tsx`          | `src/components/layout/page-shell.tsx`             | Layout component        |
| `src/components/category-filter-header.tsx` | `src/components/assets/category-filter-header.tsx` | Domain grouping         |
| `src/components/biggest-mover-card.tsx`     | `src/components/portfolio/biggest-mover-card.tsx`  | Domain grouping         |
| `src/components/calculator-result.tsx`      | `src/components/calculator/calculator-result.tsx`  | Domain grouping         |
| `src/components/dev-locale-switcher.tsx`    | `src/components/layout/dev-locale-switcher.tsx`    | Layout/dev tooling      |


### Files to Create


| File                                           | Purpose                             |
| ---------------------------------------------- | ----------------------------------- |
| `src/server/cron/auth.ts`                      | Shared cron auth helper             |
| `src/server/cron/price-snapshot.ts`            | Extracted price cron logic          |
| `src/server/cron/portfolio-snapshot.ts`        | Extracted portfolio cron logic      |
| `src/types/api.ts`                             | tRPC-derived types for components   |
| `src/types/next-auth.d.ts`                     | NextAuth session type extension     |
| `src/types/schemas.ts`                         | Zod schemas for JSON fields         |
| `src/lib/prices/index.ts`                      | Barrel file for split prices module |
| `src/lib/prices/format.ts`                     | Price formatting functions          |
| `src/lib/prices/parse.ts`                      | Price parsing functions             |
| `src/lib/prices/categories.ts`                 | Category logic                      |
| `src/lib/prices/i18n.ts`                       | Bilingual name helpers              |
| `src/lib/prices/staleness.ts`                  | Staleness check                     |
| `src/components/assets/asset-edit-modal.tsx`   | Extracted from AssetListItem        |
| `src/components/assets/asset-delete-modal.tsx` | Extracted from AssetListItem        |


### Files to Modify (Major)


| File                                  | Changes                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                | Add `updatedAt`, explicit datasource URL, composite index, rename `portfolioSnaps` → `portfolioSnapshots` |
| `src/server/api/helpers.ts`           | Consolidate all ownership helpers + shared validation schemas                                             |
| `src/server/api/routers/assets.ts`    | Remove local `requireOwnedAsset`, `quantitySchema`                                                        |
| `src/server/api/routers/alerts.ts`    | Remove local `requireOwnedAlert`, `thresholdSchema`; move settings to user router                         |
| `src/server/api/routers/user.ts`      | Add settings + toggleDigest from alerts router                                                            |
| `src/server/api/root.ts`              | Remove unused `createCaller`                                                                              |
| `src/server/api/trpc.ts`              | Replace `session as Record<string, unknown>` with typed NextAuth session                                  |
| `src/proxy.ts`                        | Add `!process.env.VERCEL` guard for dev bypass (Security 12.1)                                            |
| `src/app/api/cron/prices/route.ts`    | Use `verifyCronAuth`, delegate to `server/cron/`                                                          |
| `src/app/api/cron/portfolio/route.ts` | Use `verifyCronAuth`, delegate to `server/cron/`                                                          |
| `src/components/asset-list-item.tsx`  | Extract edit + delete modals                                                                              |
| `src/app/(app)/page.tsx`              | Extract section components                                                                                |
| `src/components/bottom-nav.tsx`       | Add accessibility attributes                                                                              |
| `src/trpc/query-client.ts`            | Narrow `shouldDehydrateQuery` in dehydrate options                                                        |
| `src/trpc/persister.ts`               | Align persistence config with narrowed dehydration                                                        |
| `tsconfig.json`                       | Remove unused `@Swagger/*` path alias                                                                     |
| `biome.json`                          | Remove `@Swagger/`** from import groups                                                                   |
| `messages/en.json`                    | Remove duplicate keys from `assets`                                                                       |
| `messages/fa.json`                    | Remove duplicate keys from `assets`                                                                       |


### Files Not Changed (Reviewed, No Issues Found)


| File                                    | Notes                                                             |
| --------------------------------------- | ----------------------------------------------------------------- |
| `src/utils/telegram.ts`                 | Clean helpers (`getRawInitData`, `isTelegramWebApp`); well-placed |
| `src/utils/theme.ts`                    | Theme logic (`normalizeTheme`, `applyTheme`); well-structured     |
| `src/trpc/storage.ts`                   | `localStorageAsync` wrapper; simple, correct                      |
| `src/lib/telegram-bot.ts`               | Bot message sender with retry; well-tested                        |
| `src/styles/fonts.ts`                   | Font declarations; clean                                          |
| `src/styles/themes/elegant.css`         | Theme variables; consistent light/dark                            |
| `scripts/migrate-default-portfolios.ts` | One-time migration script; no refactor needed                     |
| `prisma/seed.ts`                        | Dev seed script; no refactor needed                               |


---

*Generated by codebase analysis on 2026-03-20. This plan covers all source files in the repository.*