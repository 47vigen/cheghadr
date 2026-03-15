# Phase 1: Foundation — Implementation Plan

> **Cheghadr? (چه قدر؟)** — Personal Net Worth Tracker  
> Phase 1 covers everything needed before a single user can log in.  
> Source: [PRD](https://www.notion.so/324ba087d94a8114b46aeb2a4d8a7af1) · [Roadmap](https://www.notion.so/324ba087d94a81b5ad78ddbd08b067c4)  
> Estimated effort: ~9 days · Target: Week 1–2

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Key Decisions Required Before Starting](#2-key-decisions-required-before-starting)
3. [Milestone 1.1 — Project Scaffold & Config](#3-milestone-11--project-scaffold--config)
4. [Milestone 1.2 — Database Schema & Migrations](#4-milestone-12--database-schema--migrations)
5. [Milestone 1.3 — Authentication](#5-milestone-13--authentication)
6. [Milestone 1.4 — Ecotrust API Integration & Price Snapshots](#6-milestone-14--ecotrust-api-integration--price-snapshots)
7. [Dependency Graph & Task Order](#7-dependency-graph--task-order)
8. [Environment Variables Inventory](#8-environment-variables-inventory)
9. [Existing Code Bugs to Fix](#9-existing-code-bugs-to-fix)
10. [Testing Strategy](#10-testing-strategy)
11. [Definition of Done](#11-definition-of-done)

---

## 1. Current State Assessment

The project already has a Next.js scaffold. It does **not** follow the T3 Stack (`create.t3.gg`) template — it was set up independently. Here is what exists vs. what Phase 1 requires:

| Component | PRD Requires | Current State | Gap |
|---|---|---|---|
| Next.js App Router | ✅ | ✅ Next.js 16.1.6 (Turbopack) | None |
| TypeScript strict | ✅ | ✅ `strict: true` in tsconfig | None |
| Tailwind CSS | ✅ | ✅ Tailwind v4 | None |
| TelegramUI | ✅ | ⚠️ Styles imported, no `AppRoot` or components used | Wire `AppRoot` + theme |
| tRPC | ✅ | ❌ Not installed | Full setup needed |
| Prisma + PostgreSQL | ✅ | ❌ Not installed | Full setup needed |
| NextAuth.js | ✅ | ❌ Not installed | Full setup needed |
| Telegram Web App SDK | ✅ | ❌ Not installed | Full setup needed |
| Ecotrust API types | ✅ | ✅ Kubb-generated types + clients | Reuse types; redirect flow to server-side |
| React Query | — | ✅ TanStack Query v5 | Keep for tRPC adapter |
| shadcn/ui | — | ✅ Configured with RTL | Keep alongside TelegramUI |
| Env validation | ✅ | ✅ `@t3-oss/env-nextjs` | Extend with new vars |

### Decision: T3 Stack Scaffold vs. Augment Existing Project

**Recommendation: Augment the existing project.** Starting over with `create-t3-app` would discard:
- The Ecotrust OpenAPI spec + Kubb-generated types (25 files)
- The configured Axios HTTP layer with interceptors
- shadcn/ui config with RTL support, theme variables, and Biome setup
- TelegramUI style integration
- Husky + commitlint + lint-staged pipeline

Instead, we add the missing T3 pieces (tRPC, Prisma, NextAuth) into the existing scaffold. This is lower risk and preserves work already done.

### Known Bugs to Fix First

| Bug | File | Issue |
|---|---|---|
| Undefined env vars | `src/modules/API/Http/client.ts` | References `env.NEXT_PUBLIC_API_URL` — should be `env.NEXT_PUBLIC_ECOTRUST_API_URL` |
| Undefined env vars | `src/modules/API/Http/pure/client.ts` | References `env.NEXT_PUBLIC_API_URL` and `env.NEXT_PRIVATE_API_KEY` — neither defined |

---

## 2. Key Decisions Required Before Starting

These are the three blocking decisions from the PRD. The plan includes **recommendations** so work can begin immediately once confirmed.

### Decision 1: Database Host

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Neon** | Free tier generous (0.5 GB), serverless Postgres, branching for dev, excellent Prisma support | Cold starts on free tier | ✅ **Recommended** |
| Supabase | Free tier, built-in auth (unused here), realtime | Extra abstraction we don't need; auth redundant with our custom Telegram auth |  |
| Railway | Simple deploy, integrated with Git | Less generous free tier, no branching |  |

**Recommendation: Neon.** Serverless Postgres with branching fits perfectly. The free tier supports the expected load. Prisma connects via the Neon serverless driver (`@neondatabase/serverless`).

**Prisma connection string format:**
```
DATABASE_URL="postgresql://user:pass@ep-xxx.region.neon.tech/cheghadr?sslmode=require"
```

### Decision 2: Cron Strategy

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| **Vercel Cron** | Zero infra, defined in `vercel.json`, runs in same project | Requires Vercel hosting; minimum 1-min interval (we need 30 min — fine) | ✅ **Recommended** |
| External scheduler (cron-job.org, Upstash QStash) | Platform-agnostic | Extra service to manage, auth for cron endpoint |  |

**Recommendation: Vercel Cron.** Defined in `vercel.json`, triggers a Next.js API route. Protected by `CRON_SECRET` header validation. No external dependencies.

```jsonc
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

### Decision 3: Telegram Bot Token

A Telegram bot must be registered via [@BotFather](https://t.me/BotFather) to obtain the `TELEGRAM_BOT_TOKEN`. This token is needed for:
1. `initData` HMAC validation (mini app mode)
2. Telegram Login Widget verification (standalone mode)

**Action required:** Register a bot, save the token, configure it as `TELEGRAM_BOT_TOKEN` env var.

---

## 3. Milestone 1.1 — Project Scaffold & Config

**Goal:** Add Prisma, tRPC, NextAuth, and Telegram SDK to the existing project. Wire TelegramUI `AppRoot`. Validate all environment variables.

### Task 1.1.1 — Install Dependencies (~0.25d)

```bash
# Prisma
pnpm add prisma @prisma/client @neondatabase/serverless @prisma/adapter-neon

# tRPC (Next.js App Router compatible)
pnpm add @trpc/server @trpc/client @trpc/react-query @trpc/next

# NextAuth
pnpm add next-auth@beta

# Telegram SDK
pnpm add @telegram-apps/sdk @telegram-apps/sdk-react

# Zod (for tRPC input validation — already a transitive dep of t3-env, but pin explicitly)
pnpm add zod

# Superjson (for tRPC data transformer — handles BigInt, Decimal, Date)
pnpm add superjson

# Dev
pnpm add -D prisma
```

> **Note on package versions:** Use latest stable. If `next-auth@beta` has breaking changes with Next.js 16, fall back to `next-auth@4` with the `pages/` router API route adapter.

### Task 1.1.2 — Initialize Prisma (~0.25d)

```bash
npx prisma init --datasource-provider postgresql
```

This creates:
- `prisma/schema.prisma` — schema file
- `.env` — with `DATABASE_URL` placeholder (merge with existing `.env.example`)

Configure the Prisma schema for Neon serverless:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Create a Prisma client singleton at `src/server/db.ts`:

```typescript
import { Pool } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaNeon(pool)
  return new PrismaClient({ adapter })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

### Task 1.1.3 — Set Up tRPC (~0.5d)

Create the tRPC infrastructure following Next.js App Router conventions:

**File structure:**
```
src/server/
├── db.ts                    # Prisma client (Task 1.1.2)
├── api/
│   ├── trpc.ts              # tRPC init (context, procedures, router)
│   ├── root.ts              # Root router (merges all sub-routers)
│   └── routers/
│       ├── prices.ts        # prices.latest
│       └── assets.ts        # (placeholder, ships Phase 2)
src/trpc/
├── server.ts                # Server-side tRPC caller
├── client.ts                # Client-side tRPC hooks (React Query adapter)
├── query-client.ts          # Shared query client config
└── react.tsx                # tRPC React provider
src/app/api/trpc/[trpc]/
└── route.ts                 # tRPC HTTP handler (App Router)
```

**Key implementation details:**

`src/server/api/trpc.ts` — tRPC initialization:
- Creates the tRPC context with `db` (Prisma) and `session` (auth)
- Defines `publicProcedure` (no auth) and `protectedProcedure` (requires Telegram auth)
- Uses `superjson` as the data transformer (handles `BigInt`, `Decimal`, `Date`)

`src/trpc/client.ts` — Client hooks:
- Wraps `@trpc/react-query` with the existing TanStack Query client
- Configures the HTTP link to point to `/api/trpc`
- Passes `initData` in the `x-telegram-init-data` header for mini app auth

`src/app/api/trpc/[trpc]/route.ts` — HTTP handler:
- Exports `GET` and `POST` handlers via `fetchRequestHandler`
- Creates context per request (reads session or initData)

### Task 1.1.4 — Configure TelegramUI AppRoot (~0.25d)

Wrap the app with TelegramUI's `AppRoot` in the layout:

**Modify `src/app/layout.tsx`:**
- Add `<AppRoot>` from `@telegram-apps/telegram-ui`
- Set `lang="fa"` and `dir="rtl"` on `<html>` for Persian
- Wire `themeParams` from the Telegram SDK into `AppRoot` appearance prop
- Keep the existing `ThemeProvider` (for standalone web mode)

Create `src/components/telegram-provider.tsx`:
- Client component that initializes the Telegram Web App SDK
- Calls `Telegram.WebApp.expand()` on mount
- Passes `themeParams` to TelegramUI `AppRoot`
- Handles the case where the app is opened outside Telegram (no-op)

### Task 1.1.5 — Extend Environment Variables (~0.25d)

Update `src/env.js` to validate all required env vars:

```typescript
server: {
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url().optional(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  NEXT_PUBLIC_ECOTRUST_API_URL: z.string().url(),
},
client: {
  NEXT_PUBLIC_ECOTRUST_API_URL: z.string().url(),
},
```

Update `.env.example`:
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.neon.tech/cheghadr?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.region.neon.tech/cheghadr?sslmode=require"

# Auth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
TELEGRAM_BOT_TOKEN="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"

# Cron
CRON_SECRET="generate-a-random-secret"

# Ecotrust API
NEXT_PUBLIC_ECOTRUST_API_URL="https://ecotrust.ir"
```

### Milestone 1.1 Deliverables Checklist

- [ ] All new dependencies installed
- [ ] Prisma initialized with schema file and client singleton
- [ ] tRPC fully wired: init → router → HTTP handler → client hooks → React provider
- [ ] TelegramUI `AppRoot` wrapping the app with RTL + Persian
- [ ] Telegram SDK initialized (expand, themeParams)
- [ ] All env vars validated in `src/env.js`
- [ ] `.env.example` updated
- [ ] `pnpm build` passes with no errors

---

## 4. Milestone 1.2 — Database Schema & Migrations

**Goal:** Define the four core models and run the initial migration.

### Task 1.2.1 — Define Prisma Schema (~0.5d)

Add models to `prisma/schema.prisma`:

```prisma
model User {
  id              String              @id @default(cuid())
  telegramUserId  BigInt              @unique
  createdAt       DateTime            @default(now())
  assets          UserAsset[]
  portfolioSnaps  PortfolioSnapshot[]
}

model UserAsset {
  id        String   @id @default(cuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  symbol    String
  quantity  Decimal  @db.Decimal(24, 8)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, symbol])
  @@index([userId])
}

model PriceSnapshot {
  id         String   @id @default(cuid())
  snapshotAt DateTime @default(now())
  data       Json

  @@index([snapshotAt(sort: Desc)])
}

model PortfolioSnapshot {
  id         String   @id @default(cuid())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId     String
  snapshotAt DateTime @default(now())
  totalIRT   Decimal  @db.Decimal(24, 2)
  breakdown  Json

  @@index([userId, snapshotAt(sort: Desc)])
}
```

**Schema design notes:**

| Decision | Rationale |
|---|---|
| `@@unique([userId, symbol])` on `UserAsset` | Prevents duplicate assets. User edits quantity, doesn't add "500 USD" twice. |
| `Decimal(24, 8)` for quantity | Supports crypto (0.00000001 BTC) and large fiat amounts. |
| `Decimal(24, 2)` for totalIRT | Toman precision — no sub-Toman fractions needed. |
| `onDelete: Cascade` | When a User is deleted, their assets and snapshots are cleaned up. |
| `snapshotAt(sort: Desc)` index | Most queries fetch the *latest* snapshot — descending index is optimal. |
| `data Json` on PriceSnapshot | Stores the full Ecotrust API response. Avoids needing to model every field relationally. |
| `breakdown Json` on PortfolioSnapshot | Stores `{ symbol, quantity, valueIRT }[]` — enables future per-asset charts without new tables. |
| No `Account`/`Session` tables | NextAuth is configured with JWT strategy (no database sessions) to keep the schema minimal. |

### Task 1.2.2 — NextAuth Schema (JWT Strategy, No DB Sessions) (~0.25d)

We deliberately **do not** add NextAuth's `Account`, `Session`, `VerificationToken` tables. Instead:
- NextAuth uses **JWT strategy** (session stored in a signed cookie, not in the database)
- The JWT contains only `{ telegramUserId: bigint }`
- This aligns with the zero-PII principle: no name, email, or avatar stored

If we later need database sessions (for token revocation etc.), we can add the tables in a future migration.

### Task 1.2.3 — Run Initial Migration (~0.25d)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

Verify:
- Migration SQL file created in `prisma/migrations/`
- `@prisma/client` generated successfully
- `npx prisma studio` opens and shows the four empty tables

### Task 1.2.4 — Seed Script (Optional, ~0.25d)

Create `prisma/seed.ts` for development:
- Creates a test `User` with a known `telegramUserId`
- Creates a few `UserAsset` records
- Creates a sample `PriceSnapshot` from a captured Ecotrust response

Configure in `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Milestone 1.2 Deliverables Checklist

- [ ] All four models defined in `prisma/schema.prisma`
- [ ] Initial migration created and applied to dev database
- [ ] Prisma Client generated with correct types
- [ ] `npx prisma studio` shows all tables
- [ ] (Optional) Seed script works

---

## 5. Milestone 1.3 — Authentication

**Goal:** Users authenticate via Telegram in both mini app mode and standalone web mode. The tRPC context resolves the user from either auth path.

### Architecture Overview

```
┌──────────────────────────────────┐
│        Telegram Mini App         │
│  (opened inside Telegram)        │
│                                  │
│  SDK provides initData token     │
│  ↓                               │
│  Sent as header on every tRPC    │
│  request:                        │
│  x-telegram-init-data: <token>   │
└───────────────┬──────────────────┘
                │
                ▼
┌──────────────────────────────────┐
│        tRPC Context              │
│                                  │
│  1. Check initData header        │
│     → HMAC-validate with bot     │
│       token                      │
│     → Extract telegramUserId     │
│                                  │
│  2. If no initData, check        │
│     NextAuth session cookie      │
│     → Extract telegramUserId     │
│                                  │
│  3. Find-or-create User record   │
│     by telegramUserId            │
└──────────────────────────────────┘
                │
┌──────────────────────────────────┐
│        Standalone Web            │
│  (opened in browser)             │
│                                  │
│  Shows Telegram Login Widget     │
│  ↓                               │
│  Widget returns auth data        │
│  ↓                               │
│  POST to NextAuth signIn()       │
│  ↓                               │
│  Session cookie set              │
│  (JWT with telegramUserId only)  │
└──────────────────────────────────┘
```

### Task 1.3.1 — Telegram initData Validation (~1d)

**File:** `src/server/auth/telegram.ts`

Implement `initData` HMAC validation per the [Telegram Mini App docs](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):

```typescript
import crypto from 'node:crypto'

export function validateInitData(
  initData: string,
  botToken: string,
): { valid: boolean; user?: { id: number } } {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { valid: false }

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  if (calculatedHash !== hash) return { valid: false }

  // Check auth_date is not too old (allow 1 hour)
  const authDate = Number(params.get('auth_date'))
  const now = Math.floor(Date.now() / 1000)
  if (now - authDate > 3600) return { valid: false }

  const userStr = params.get('user')
  if (!userStr) return { valid: false }

  const user = JSON.parse(userStr)
  return { valid: true, user: { id: user.id } }
}
```

**Considerations:**
- The `auth_date` check prevents replay attacks (1-hour window)
- Only `user.id` is extracted — no name/username/photo per privacy policy
- This function is called in the tRPC context for every authenticated request
- The `@telegram-apps/sdk` package also provides `initData` parsing utilities — consider using `parseInitData` + `validate` from there for additional robustness

### Task 1.3.2 — NextAuth Telegram Provider (~1d)

**File:** `src/server/auth/config.ts`

Configure NextAuth with a custom Telegram Credentials provider:

```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import crypto from 'node:crypto'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        id: {},
        first_name: {},
        last_name: {},
        username: {},
        photo_url: {},
        auth_date: {},
        hash: {},
      },
      async authorize(credentials) {
        // Validate Telegram Login Widget data
        if (!validateTelegramWidget(credentials)) return null

        return {
          id: String(credentials.id),
          // Store NOTHING else — privacy first
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.telegramUserId = BigInt(user.id)
      }
      return token
    },
    session({ session, token }) {
      session.telegramUserId = token.telegramUserId as bigint
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
```

**Telegram Login Widget verification** (separate from initData):

```typescript
function validateTelegramWidget(data: Record<string, unknown>): boolean {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')

  const secretKey = crypto
    .createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN!)
    .digest()

  const hmac = crypto
    .createHmac('sha256', secretKey)
    .update(checkString)
    .digest('hex')

  return hmac === hash
}
```

**File:** `src/app/api/auth/[...nextauth]/route.ts`
```typescript
import { handlers } from '@/server/auth/config'
export const { GET, POST } = handlers
```

### Task 1.3.3 — tRPC Context Middleware (~0.5d)

**File:** `src/server/api/trpc.ts` (extend from Task 1.1.3)

The tRPC context must resolve the user from either auth path:

```typescript
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { db } from '@/server/db'
import { validateInitData } from '@/server/auth/telegram'
import { auth } from '@/server/auth/config'

export async function createContext(opts: { headers: Headers }) {
  let telegramUserId: bigint | null = null

  // Path 1: Mini app mode — initData header
  const initData = opts.headers.get('x-telegram-init-data')
  if (initData) {
    const result = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN!)
    if (result.valid && result.user) {
      telegramUserId = BigInt(result.user.id)
    }
  }

  // Path 2: Standalone mode — NextAuth session
  if (!telegramUserId) {
    const session = await auth()
    if (session?.telegramUserId) {
      telegramUserId = BigInt(session.telegramUserId)
    }
  }

  return { db, telegramUserId }
}

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.telegramUserId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Find-or-create user
  const user = await ctx.db.user.upsert({
    where: { telegramUserId: ctx.telegramUserId },
    update: {},
    create: { telegramUserId: ctx.telegramUserId },
  })

  return next({ ctx: { ...ctx, user } })
})
```

### Task 1.3.4 — Standalone Login Page (~0.5d)

**File:** `src/app/login/page.tsx`

- Shown only when the app is opened outside Telegram (no `initData` available)
- Renders the [Telegram Login Widget](https://core.telegram.org/widgets/login) (`<script>` embed or iframe)
- On successful login, calls `signIn('telegram', data)` via NextAuth
- Redirects to the main app on success
- Uses TelegramUI components for consistent styling

**Detection logic** (in layout or middleware):
```typescript
// If inside Telegram, initData is available via the SDK
// If outside Telegram and no session, redirect to /login
```

**File:** `src/middleware.ts` — Route protection

```typescript
import { auth } from '@/server/auth/config'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoginPage = req.nextUrl.pathname === '/login'
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/')
  const isTrpcRoute = req.nextUrl.pathname.startsWith('/api/trpc')
  const isCronRoute = req.nextUrl.pathname.startsWith('/api/cron')

  // Allow public routes
  if (isLoginPage || isCronRoute) return NextResponse.next()

  // tRPC handles its own auth via initData / session
  if (isTrpcRoute) return NextResponse.next()

  // For page routes: if no session AND no Telegram context, redirect to login
  // Note: initData check happens client-side; middleware only checks session
  if (!req.auth && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### Milestone 1.3 Deliverables Checklist

- [ ] `initData` HMAC validation working (unit-testable with known test vectors)
- [ ] NextAuth configured with JWT strategy + custom Telegram Credentials provider
- [ ] Telegram Login Widget verification working
- [ ] tRPC context resolves user from either initData or NextAuth session
- [ ] `protectedProcedure` rejects unauthenticated requests with 401
- [ ] `protectedProcedure` auto-creates User record on first login
- [ ] Login page with Telegram Login Widget renders correctly
- [ ] Middleware redirects unauthenticated browser requests to `/login`
- [ ] No PII (name, phone, email) stored in any database record or JWT

---

## 6. Milestone 1.4 — Ecotrust API Integration & Price Snapshots

**Goal:** Every 30 minutes, fetch all prices from Ecotrust and store as a `PriceSnapshot`. Expose the latest snapshot via tRPC. Never call Ecotrust from the browser.

### Task 1.4.1 — Cron Route `/api/cron/prices` (~1d)

**File:** `src/app/api/cron/prices/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db'

const ECOTRUST_API_URL = process.env.NEXT_PUBLIC_ECOTRUST_API_URL

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch prices from Ecotrust
    const response = await fetch(`${ECOTRUST_API_URL}/api/prices`, {
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Ecotrust API returned ${response.status}`)
    }

    const data = await response.json()

    // Validate response has data array
    if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Ecotrust API returned empty or invalid data')
    }

    // Save snapshot
    await db.priceSnapshot.create({
      data: {
        data: data, // Full API response as JSON
      },
    })

    // Prune old snapshots (> 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count } = await db.priceSnapshot.deleteMany({
      where: { snapshotAt: { lt: ninetyDaysAgo } },
    })

    return NextResponse.json({
      success: true,
      assetsCount: data.data.length,
      prunedCount: count,
    })
  } catch (error) {
    console.error('[CRON] Price snapshot failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 },
    )
  }
}
```

**Vercel Cron configuration** — `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/prices",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

**Key design decisions:**
- The entire Ecotrust response is stored as a single JSON blob (not normalized into rows). This is deliberate: the response is ~50-100 KB, and storing it as JSON makes the cron job simple and fast. Querying specific assets is done in application code from the latest snapshot.
- Pruning happens in the same request to avoid needing a separate cleanup job.
- If Ecotrust returns empty data, we don't overwrite the last good snapshot.

### Task 1.4.2 — tRPC `prices.latest` Procedure (~0.5d)

**File:** `src/server/api/routers/prices.ts`

```typescript
import { router, publicProcedure } from '@/server/api/trpc'

export const pricesRouter = router({
  latest: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })

    if (!snapshot) {
      return { data: null, stale: true, snapshotAt: null }
    }

    // Check staleness (> 60 minutes)
    const minutesOld =
      (Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60
    const stale = minutesOld > 60

    return {
      data: snapshot.data,
      stale,
      snapshotAt: snapshot.snapshotAt,
    }
  }),
})
```

This procedure is `publicProcedure` (no auth required) because the Price List page should be accessible to all users — even those not yet logged in (potential P1 guest mode).

### Task 1.4.3 — Snapshot Staleness Indicator (~0.25d)

Create a reusable component `src/components/staleness-badge.tsx`:
- If latest snapshot is > 60 minutes old, show a warning badge
- If no snapshot exists, show "Prices unavailable" state
- Uses TelegramUI `Badge` or `Snackbar` component

This component will be used on the Price List page and My Assets page in Phase 2.

### Task 1.4.4 — Migrate Client-Side Ecotrust Calls (~0.5d)

The existing Kubb-generated client (`getPrices`) calls Ecotrust directly from the browser. For Phase 1:

1. **Keep** the Kubb-generated types (`PriceItem`, `PricesResponse`, `CategorySymbol`, etc.) — these are valuable type definitions.
2. **Remove** or deprecate the client-side Kubb hooks (`useGetPrices`, `useGetPricesSuspense`) — these should not be used in the final app.
3. **Replace** direct API calls with tRPC `prices.latest` query.
4. **Keep** the server-side Axios client (`src/modules/API/Http/pure/client.ts`) but fix the env var bug. This can be used by the cron job as an alternative to raw `fetch`.

### Milestone 1.4 Deliverables Checklist

- [ ] Cron route `/api/cron/prices` fetches Ecotrust and saves `PriceSnapshot`
- [ ] Cron route protected by `CRON_SECRET` header
- [ ] `vercel.json` with 30-minute cron schedule
- [ ] Snapshot pruning (90 days) works
- [ ] tRPC `prices.latest` returns the most recent snapshot with staleness flag
- [ ] Staleness badge component created
- [ ] Client-side direct Ecotrust calls removed/deprecated
- [ ] Manual test: trigger cron → verify snapshot in DB → query via tRPC → see data

---

## 7. Dependency Graph & Task Order

```
Week 1                                      Week 2
─────────────────────────────────────────   ──────────────────────────────────────

[1.1.1] Install deps ─┐
                       │
[1.1.5] Env vars ─────┤
                       │
[1.1.2] Init Prisma ──┼── [1.2.1] Schema ── [1.2.2] No DB sessions ── [1.2.3] Migrate
                       │                                                       │
[1.1.3] tRPC setup ───┤                                                       │
                       │                                                       ▼
[1.1.4] TelegramUI ───┘               [1.3.1] initData validation ────┐
                                                                       │
                                       [1.3.2] NextAuth provider ─────┼── [1.3.3] tRPC context
                                                                       │         │
                                       [1.3.4] Login page ────────────┘         │
                                                                                 ▼
                                                          [1.4.1] Cron route ── [1.4.2] prices.latest
                                                                                     │
                                                          [1.4.3] Staleness badge ───┘
                                                                                     │
                                                          [1.4.4] Migrate calls ─────┘
```

### Recommended Execution Order

| Day | Tasks | Parallelizable? |
|---|---|---|
| **Day 1** | 1.1.1 (deps) → 1.1.5 (env) → 1.1.2 (Prisma init) | Sequential |
| **Day 2** | 1.1.3 (tRPC) + 1.1.4 (TelegramUI) | ✅ Parallel |
| **Day 3** | 1.2.1 (Schema) → 1.2.2 (JWT decision) → 1.2.3 (Migrate) | Sequential |
| **Day 4** | 1.3.1 (initData validation) | Single task, complex |
| **Day 5** | 1.3.2 (NextAuth Telegram provider) | Single task, complex |
| **Day 6** | 1.3.3 (tRPC context) + 1.3.4 (Login page) | ✅ Parallel |
| **Day 7** | 1.4.1 (Cron route) | Single task |
| **Day 8** | 1.4.2 (prices.latest) + 1.4.3 (Staleness badge) + 1.4.4 (Migrate calls) | ✅ Parallel |
| **Day 9** | Integration testing, bug fixes, env bug fixes | Buffer day |

---

## 8. Environment Variables Inventory

| Variable | Required By | Secret? | Example |
|---|---|---|---|
| `DATABASE_URL` | Prisma | Yes | `postgresql://user:pass@ep-xxx.neon.tech/cheghadr?sslmode=require` |
| `DIRECT_URL` | Prisma (migrations) | Yes | Same as DATABASE_URL for Neon |
| `NEXTAUTH_SECRET` | NextAuth JWT signing | Yes | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | NextAuth callbacks | No | `http://localhost:3000` / production URL |
| `TELEGRAM_BOT_TOKEN` | initData + Widget auth | Yes | `123456:ABC-DEF...` |
| `CRON_SECRET` | Cron route auth | Yes | Random 32+ char string |
| `NEXT_PUBLIC_ECOTRUST_API_URL` | Cron route (server) | No | `https://ecotrust.ir` |
| `NODE_ENV` | App behavior | No | `development` / `production` |

---

## 9. Existing Code Bugs to Fix

These should be addressed at the start of Phase 1 (Day 1):

### Bug 1: Undefined `NEXT_PUBLIC_API_URL`

**File:** `src/modules/API/Http/client.ts` (line 19)
```typescript
// Current (broken):
baseURL: env.NEXT_PUBLIC_API_URL,

// Fix:
baseURL: env.NEXT_PUBLIC_ECOTRUST_API_URL,
```

### Bug 2: Undefined `NEXT_PUBLIC_API_URL` and `NEXT_PRIVATE_API_KEY`

**File:** `src/modules/API/Http/pure/client.ts` (lines 11, 15)
```typescript
// Current (broken):
baseURL: env.NEXT_PUBLIC_API_URL,
headers: { 'x-api-key': env.NEXT_PRIVATE_API_KEY },

// Fix:
baseURL: env.NEXT_PUBLIC_ECOTRUST_API_URL,
// Remove x-api-key header (Ecotrust API doesn't require it)
```

---

## 10. Testing Strategy

### Unit Tests (Recommended for Phase 1)

| Test | What it validates |
|---|---|
| `initData` HMAC validation | Correct hash calculation, expired auth_date rejection, missing fields |
| Telegram Widget validation | Correct hash for widget data, tampered data rejection |
| tRPC context creation | User resolution from initData, from session, unauthenticated case |
| Cron route | Snapshot creation, pruning, error handling for bad API responses |

### Manual Integration Tests

| Test | Steps |
|---|---|
| Prisma connection | `npx prisma studio` → see tables → create a record |
| tRPC end-to-end | Start dev server → call `prices.latest` from browser devtools |
| Cron trigger | `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/prices` |
| Auth flow (standalone) | Open `localhost:3000` in browser → redirected to `/login` → complete Telegram login |
| Auth flow (mini app) | Open via Telegram BotFather test link → verify auto-login |

### Testing Tools

The project does not currently have a test runner. **Recommended:** Add Vitest (lightweight, fast, ESM-native):

```bash
pnpm add -D vitest @testing-library/react
```

This is optional for Phase 1 but strongly recommended before Phase 2.

---

## 11. Definition of Done

Phase 1 is complete when **all** of the following are true:

### Infrastructure
- [ ] `pnpm build` succeeds with zero errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes (Biome)
- [ ] All env vars are validated at build time via `@t3-oss/env-nextjs`

### Database
- [ ] Prisma schema has all 4 models (`User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot`)
- [ ] Migration applied successfully to a real PostgreSQL database
- [ ] Prisma Client generated with correct TypeScript types
- [ ] `db.user.create({ data: { telegramUserId: 123456789n } })` works

### Authentication
- [ ] `initData` validation accepts valid tokens and rejects invalid/expired ones
- [ ] NextAuth session is created with JWT strategy after Telegram Login Widget auth
- [ ] JWT contains only `telegramUserId` — no PII
- [ ] tRPC `protectedProcedure` returns 401 for unauthenticated requests
- [ ] tRPC `protectedProcedure` auto-creates `User` record on first login
- [ ] `/login` page renders with Telegram Login Widget

### Price Snapshots
- [ ] `/api/cron/prices` fetches Ecotrust API and creates a `PriceSnapshot`
- [ ] Cron endpoint rejects requests without valid `CRON_SECRET`
- [ ] Snapshots older than 90 days are pruned
- [ ] tRPC `prices.latest` returns the most recent snapshot
- [ ] Staleness flag is `true` when snapshot is > 60 minutes old
- [ ] `vercel.json` configured with 30-minute cron schedule

### Telegram Integration
- [ ] TelegramUI `AppRoot` wraps the app
- [ ] Telegram SDK initializes on mount (expand, themeParams)
- [ ] App renders in RTL with `lang="fa"`
- [ ] Outside Telegram, app falls back gracefully (no crashes)

### Code Quality
- [ ] No client-side code calls the Ecotrust API directly
- [ ] All new server code lives under `src/server/`
- [ ] All new API routes live under `src/app/api/`
- [ ] TypeScript strict mode — no `any` in new code
- [ ] Existing env var bugs fixed

---

## File Tree After Phase 1

```
cheghadr/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   └── 20260315_init/
│   │       └── migration.sql
│   └── seed.ts                          (optional)
├── src/
│   ├── app/
│   │   ├── layout.tsx                   (modified: AppRoot, RTL, providers)
│   │   ├── page.tsx                     (minimal — redirect or placeholder)
│   │   ├── login/
│   │   │   └── page.tsx                 (Telegram Login Widget)
│   │   ├── globals.css                  (unchanged)
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts         (NextAuth handler)
│   │       ├── trpc/
│   │       │   └── [trpc]/
│   │       │       └── route.ts         (tRPC HTTP handler)
│   │       └── cron/
│   │           └── prices/
│   │               └── route.ts         (Price snapshot cron)
│   ├── server/
│   │   ├── db.ts                        (Prisma client singleton)
│   │   ├── auth/
│   │   │   ├── config.ts                (NextAuth config)
│   │   │   └── telegram.ts              (initData + widget validation)
│   │   └── api/
│   │       ├── trpc.ts                  (tRPC init, context, procedures)
│   │       ├── root.ts                  (Root router)
│   │       └── routers/
│   │           └── prices.ts            (prices.latest)
│   ├── trpc/
│   │   ├── server.ts                    (Server-side caller)
│   │   ├── client.ts                    (Client hooks)
│   │   ├── query-client.ts              (Shared query config)
│   │   └── react.tsx                    (React provider)
│   ├── components/
│   │   ├── telegram-provider.tsx         (Telegram SDK init + AppRoot)
│   │   ├── staleness-badge.tsx           (Price staleness indicator)
│   │   ├── theme-provider.tsx            (existing)
│   │   └── ui/
│   │       └── button.tsx                (existing)
│   ├── modules/
│   │   └── API/                          (existing — keep types, deprecate hooks)
│   ├── utils/                            (existing)
│   ├── env.js                            (modified: new vars)
│   └── middleware.ts                     (route protection)
├── vercel.json                           (cron config)
├── .env.example                          (updated)
├── package.json                          (updated deps)
└── ... (existing config files)
```

---

## Appendix A: PRD ↔ Phase 1 Traceability

| PRD Requirement | Phase 1 Task | Status After Phase 1 |
|---|---|---|
| Next.js App Router + TypeScript strict | 1.1.1 | ✅ Already exists |
| Tailwind CSS | 1.1.1 | ✅ Already exists |
| TelegramUI integration | 1.1.4 | ✅ Wired |
| Prisma + PostgreSQL | 1.1.2, 1.2.x | ✅ Complete |
| tRPC for all client-server communication | 1.1.3 | ✅ Infrastructure ready |
| `initData` validation | 1.3.1 | ✅ Complete |
| NextAuth + Telegram OAuth | 1.3.2 | ✅ Complete |
| Unified tRPC context | 1.3.3 | ✅ Complete |
| Login page (standalone) | 1.3.4 | ✅ Complete |
| Price snapshot cron | 1.4.1 | ✅ Complete |
| `prices.latest` tRPC procedure | 1.4.2 | ✅ Complete |
| Staleness indicator | 1.4.3 | ✅ Component ready |
| Snapshot pruning (90 days) | 1.4.1 | ✅ In cron route |
| No PII stored | 1.2.1, 1.3.x | ✅ Enforced by schema + JWT |
| Client never calls Ecotrust directly | 1.4.4 | ✅ Migrated |

## Appendix B: Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Next.js 16 incompatible with `next-auth@beta` | High | Medium | Fall back to `next-auth@4` with pages router adapter; or use Auth.js v5 |
| Next.js 16 incompatible with `@trpc/next` | High | Medium | Use `@trpc/server` with raw `fetchRequestHandler` in Route Handlers (bypasses the Next.js adapter entirely) |
| Ecotrust API rate-limits the cron job | Medium | Low | 1 request per 30 min is very low. Add retry with backoff. Cache last successful response. |
| Telegram Login Widget CSP issues | Low | Medium | Add `telegram.org` to Content Security Policy in `next.config.ts` |
| Neon cold start latency | Low | Medium | Use connection pooling. First request may be 200-500ms; subsequent requests <50ms. |
| `@telegram-apps/telegram-ui` conflicts with shadcn | Low | Low | Keep both; TelegramUI for in-Telegram pages, shadcn for standalone web / admin |
