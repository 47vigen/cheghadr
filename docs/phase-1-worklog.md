# Phase 1 Work Log

> **Branch:** `cursor/phase-1-plan-documentation-129f`  
> **Started:** 2026-03-15  
> **Status:** Complete — awaiting environment secrets to run migrations

---

## What Was Built

Phase 1 adds the complete infrastructure layer before any product UI ships: database, API layer, authentication, and price snapshots.

---

## Commits

### 1. `feat: implement Phase 1 foundation`

Full implementation of every milestone in `docs/phase-1-plan.md`.

**Bug fixes (pre-existing):**
- `src/modules/API/Http/client.ts` — `env.NEXT_PUBLIC_API_URL` → `env.NEXT_PUBLIC_ECOTRUST_API_URL`
- `src/modules/API/Http/pure/client.ts` — same rename + removed non-existent `x-api-key` header

**Milestone 1.1 — Scaffold & Config:**
- Installed: `prisma`, `@prisma/client`, `@neondatabase/serverless`, `@prisma/adapter-neon`, `@trpc/server`, `@trpc/client`, `@trpc/react-query`, `next-auth@beta`, `@telegram-apps/sdk`, `@telegram-apps/sdk-react`, `zod`, `superjson`, `vitest`, `tsx`
- Extended `src/env.js` with `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- Updated `.env.example` with all new variables

**Milestone 1.2 — Database Schema:**
- `prisma/schema.prisma` — four models: `User`, `UserAsset`, `PriceSnapshot`, `PortfolioSnapshot`
- `prisma.config.ts` — Prisma 7 datasource config (URL moved out of schema per Prisma 7 API)
- `src/server/db.ts` — `PrismaClient` singleton with `PrismaNeon` adapter
- `prisma/seed.ts` — development seed: test user, assets, sample price snapshot

**Milestone 1.3 — tRPC:**
- `src/server/api/trpc.ts` — `createTRPCContext`, `publicProcedure`, `protectedProcedure` (auto upserts User on first login)
- `src/server/api/root.ts` — `appRouter` merging prices + assets routers
- `src/server/api/routers/prices.ts` — `prices.latest` (public, returns snapshot + staleness flag)
- `src/server/api/routers/assets.ts` — `assets.list` placeholder (Phase 2)
- `src/trpc/query-client.ts` — shared `QueryClient` with SuperJSON serializers
- `src/trpc/server.ts` — server-side tRPC caller via `createCallerFactory`
- `src/trpc/react.tsx` — `TRPCReactProvider` + `api` hooks (wraps `QueryClientProvider`, forwards `x-telegram-init-data` header)
- `src/app/api/trpc/[trpc]/route.ts` — HTTP handler via `fetchRequestHandler`

**Milestone 1.3 — Authentication:**
- `src/server/auth/telegram.ts` — `validateInitData` (Mini App HMAC) + `validateTelegramWidget` (Login Widget HMAC)
- `src/server/auth/config.ts` — `NextAuth` v5 with JWT strategy, Telegram Credentials provider
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js route handler
- `src/app/login/page.tsx` — Telegram Login Widget page (bot username from `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`)
- `src/middleware.ts` (later renamed to `src/proxy.ts`) — session-based route protection

**Milestone 1.4 — Telegram UI + Layout:**
- `src/types/telegram.d.ts` — global `Window.Telegram`, `TelegramWidgetUser` types
- `src/components/telegram-provider.tsx` — `AppRoot` + SDK init (`expand()`, `ready()`, `colorScheme`)
- `src/app/layout.tsx` — `lang="fa"` / `dir="rtl"`, provider stack: `ThemeProvider → TRPCReactProvider → TelegramProvider`

**Milestone 1.4 — Cron + Price Snapshots:**
- `src/app/api/cron/prices/route.ts` — fetches Ecotrust, stores `PriceSnapshot`, prunes > 90 days
- `src/components/staleness-badge.tsx` — warning UI when snapshot is > 60 minutes old
- `vercel.json` — was used for Vercel Cron during Phase 1; production now uses **cron-job.org** (`docs/cron-scheduling.md`), file is `{}`

**Testing:**
- `vitest.config.ts` + `src/server/auth/__tests__/telegram.test.ts` — 8 unit tests covering `validateInitData` and `validateTelegramWidget`

---

### 2. `fix: apply quality review fixes`

Code review (parallel subagents) identified 5 high-severity issues:

| Issue | Fix |
|---|---|
| Non-constant-time HMAC comparison (timing attack) | `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` in both validators |
| No `auth_date` expiry in `validateTelegramWidget` (replay attack) | Reject tokens older than 24 h |
| `CRON_SECRET` undefined → `"Bearer undefined"` auth bypass | Explicit truthy check before comparison |
| Unguarded `BigInt()` on `user.id` → unhandled `TypeError` | Validate `typeof id === 'number' && Number.isInteger(id)` before conversion |
| Unguarded `BigInt()` on session `telegramUserId` | Regex `/^\d+$/` check + `try/catch` |

Additional fixes:
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` env var replaces hardcoded `'YOUR_BOT_USERNAME'` placeholder in login page
- `DATABASE_URL` guard with descriptive error in `src/server/db.ts`
- `ECOTRUST_API_URL` guard in cron route
- Cleanup `window.onTelegramAuth` on component unmount
- Moved `TelegramWidgetUser` type to `src/types/telegram.d.ts`
- Removed `'use client'` from `staleness-badge.tsx` (server-renderable)
- `ReactNode` via named import instead of `React.ReactNode` namespace
- `STALE_AFTER_MINUTES = 60` named constant

---

### 3. `fix: change cron schedule to daily for Vercel Hobby plan`

Vercel Hobby plan only allows cron jobs that run **once per day**. The original `*/30 * * * *` schedule caused a deployment error:

> *Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day.*

The project later moved scheduling to **[cron-job.org](https://cron-job.org)** so price snapshots can run every 30 minutes without Vercel Pro. `vercel.json` no longer defines `crons`. See [`docs/cron-scheduling.md`](./cron-scheduling.md).

---

### 4. `fix: resolve Vercel build failures`

Two build errors on Vercel:

**Error 1 — `node:crypto` in Edge Runtime:**
```
A Node.js module is loaded ('node:crypto' at line 1) which is not supported in the Edge Runtime.
Import chain: middleware.ts → auth/config.ts → telegram.ts
```
Fix: created `src/server/auth/edge-config.ts` (minimal, Edge-safe config with no imports) and pointed `middleware.ts` to it. The full config stays in `config.ts` for API routes which run on Node.js.

**Error 2 — Prisma `PrismaClient` not found:**
```
Type error: Module '"@prisma/client"' has no exported member 'PrismaClient'.
```
Fix: `prisma/seed.ts` was being type-checked but Prisma client wasn't generated on Vercel.
- Added `"prisma"` to `tsconfig.json` `exclude` (seed.ts is a script, not app code)
- Added `"postinstall": "prisma generate"` to `package.json` (runs during `pnpm install` on Vercel, before the TS check)

---

### 5. `feat: migrate middleware.ts → proxy.ts + add phase-1-worklog`

Next.js 16 deprecates `middleware.ts` in favour of `proxy.ts`.

**Key difference:** `proxy.ts` **always runs on Node.js** runtime (not Edge). This made the `edge-config.ts` workaround from commit 4 unnecessary — `proxy.ts` can import `node:crypto` directly.

Changes:
- Renamed `src/middleware.ts` → `src/proxy.ts`
- Updated import to use full `auth/config.ts` (was using edge config)
- Deleted `src/server/auth/edge-config.ts` (no longer needed)

---

## Deviations from Plan

| Plan | Actual | Reason |
|---|---|---|
| `@trpc/next` | Not installed — used `fetchRequestHandler` directly | `@trpc/next` does not support App Router route handlers |
| `previewFeatures = ["driverAdapters"]` in schema | Removed | Prisma 7 stable: driver adapters no longer need a preview flag |
| `url = env("DATABASE_URL")` in schema | Removed | Prisma 7 breaks with `url` in datasource; moved to `prisma.config.ts` |
| `new Pool(...)` passed to `PrismaNeon` | `new PrismaNeon({ connectionString })` | Prisma 7 adapter API changed: takes `PoolConfig`, not a `Pool` instance |
| `next-auth@beta` JWT augmentation via `next-auth/jwt` | Used `token.telegramUserId` with `as` casts | Module augmentation for `next-auth/jwt` is unreliable in v5 beta.30 |
| `cron schedule: */30 * * * *` | Vercel Hobby forced daily; then **cron-job.org** for flexible schedules | See `docs/cron-scheduling.md`; `vercel.json` has no `crons` |
| `src/middleware.ts` | `src/proxy.ts` | Next.js 16 deprecates `middleware.ts`; proxy runs on Node.js |

---

## Files Created / Modified

### New files (30)

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Four domain models |
| `prisma.config.ts` | Prisma 7 datasource config |
| `prisma/seed.ts` | Dev seed script |
| `src/server/db.ts` | Prisma singleton with Neon adapter |
| `src/server/api/trpc.ts` | tRPC init, context, procedures |
| `src/server/api/root.ts` | Root router + caller factory |
| `src/server/api/routers/prices.ts` | `prices.latest` |
| `src/server/api/routers/assets.ts` | `assets.list` (Phase 2 placeholder) |
| `src/server/auth/telegram.ts` | initData + widget HMAC validators |
| `src/server/auth/config.ts` | NextAuth v5 config |
| `src/server/auth/__tests__/telegram.test.ts` | 8 unit tests |
| `src/trpc/query-client.ts` | QueryClient with SuperJSON |
| `src/trpc/server.ts` | Server-side tRPC caller |
| `src/trpc/react.tsx` | React provider + `api` hooks |
| `src/app/api/trpc/[trpc]/route.ts` | tRPC HTTP handler |
| `src/app/api/auth/[...nextauth]/route.ts` | Auth.js handler |
| `src/app/api/cron/prices/route.ts` | Price snapshot cron |
| `src/app/login/page.tsx` | Telegram Login Widget page |
| `src/proxy.ts` | Route protection (replaces middleware) |
| `src/components/telegram-provider.tsx` | AppRoot + SDK init |
| `src/components/staleness-badge.tsx` | Price staleness indicator |
| `src/types/telegram.d.ts` | Global Telegram SDK types |
| `vercel.json` | Empty `{}` — cron schedules live in cron-job.org (`docs/cron-scheduling.md`) |
| `vitest.config.ts` | Test runner config |

### Modified files (8)

| File | Change |
|---|---|
| `src/app/layout.tsx` | `lang="fa"` / `dir="rtl"`, full provider stack |
| `src/env.js` | 6 new env vars |
| `.env.example` | All required vars documented |
| `src/modules/API/Http/client.ts` | Bug fix: `NEXT_PUBLIC_API_URL` → `NEXT_PUBLIC_ECOTRUST_API_URL` |
| `src/modules/API/Http/pure/client.ts` | Bug fix: same rename + removed `x-api-key` header |
| `package.json` | New deps, scripts (`db:*`, `test`, `postinstall`) |
| `tsconfig.json` | Exclude `prisma/` directory |
| `pnpm-workspace.yaml` | Allow Prisma build scripts |

---

## To Do Before First Deployment

These steps require secrets and external services — they cannot be automated by an agent.

### 1. Register a Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Run `/newbot` and follow the prompts
3. Copy the token: `123456:ABC-DEF...`
4. Run `/setdomain` and set your production domain (required for Login Widget)
5. Set environment variables:
   - `TELEGRAM_BOT_TOKEN=<token>`
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<bot_username>` (without `@`)

### 2. Create a Neon Database

1. Sign up at [neon.tech](https://neon.tech) and create a project named `cheghadr`
2. Copy the connection strings from the Neon console
3. Set environment variables:
   - `DATABASE_URL=postgresql://...` (pooled connection, for runtime)
   - `DIRECT_URL=postgresql://...` (direct connection, for migrations)

### 3. Run the Initial Migration

```bash
# With real credentials in .env.local:
pnpm db:migrate
# → creates prisma/migrations/YYYYMMDD_init/migration.sql
# → applies schema to the live database

pnpm db:studio
# → open Prisma Studio to verify the 4 tables exist
```

### 4. Generate Remaining Secrets

```bash
# NEXTAUTH_SECRET (min 32 chars):
openssl rand -base64 32

# CRON_SECRET:
openssl rand -base64 24
```

### 5. Set Vercel Environment Variables

In the Vercel dashboard → Settings → Environment Variables:

| Variable | Where |
|---|---|
| `DATABASE_URL` | Production + Preview |
| `DIRECT_URL` | Production + Preview |
| `NEXTAUTH_SECRET` | Production + Preview |
| `NEXTAUTH_URL` | Production only (your domain) |
| `TELEGRAM_BOT_TOKEN` | Production + Preview |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | All environments |
| `CRON_SECRET` | Production only |
| `NEXT_PUBLIC_ECOTRUST_API_URL` | All environments (`https://ecotrust.ir`) |

### 6. Production cron scheduling (cron-job.org)

Vercel Cron is **not** used. Configure **[cron-job.org](https://cron-job.org)** (or another HTTP cron) to **GET** the cron routes with header `Authorization: Bearer $CRON_SECRET`. Schedules and URLs: [`docs/cron-scheduling.md`](./cron-scheduling.md). Repository `vercel.json` stays `{}` (no `crons`).

---

## Verification Checklist

Run these after setting up the environment:

```bash
# TypeScript: zero errors
pnpm typecheck

# Unit tests: 8/8 pass
pnpm test

# Prisma client generated
pnpm db:generate

# Dev server starts
pnpm dev

# Trigger cron manually
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/prices

# Query latest prices via tRPC
# Open http://localhost:3000 in browser devtools:
# fetch('/api/trpc/prices.latest?batch=1&input={}').then(r=>r.json()).then(console.log)
```
