# Agents

## Cursor Cloud specific instructions

### Project overview
Cheghadr? (چه‌قدر؟) is a Persian (RTL) personal net worth tracker — a Telegram Mini App + standalone web app built with Next.js 16 (App Router, Turbopack), tRPC v11, Prisma 7 + Neon Serverless Postgres, and NextAuth v5 (Telegram credentials). See `docs/phase-1-plan.md` for full architecture.

### Key commands
See `package.json` scripts. Most-used:
- `pnpm dev` — Next.js dev server (Turbopack) on port 3000
- `pnpm lint` — Biome lint
- `pnpm typecheck` — `next typegen && tsc --noEmit`
- `pnpm test` — Vitest (unit tests in `src/**/*.test.ts`)
- `pnpm db:push` — Push Prisma schema to Neon DB
- `pnpm check` — Runs both typecheck + lint

### Gotchas
- **Env vars**: All required secrets (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `TELEGRAM_BOT_TOKEN`, `CRON_SECRET`, `NEXT_PUBLIC_ECOTRUST_API_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`) are injected as system environment variables by Cursor's secret management. These **override** any `.env` file values. Do not rely on `.env` file values at runtime.
- **`SKIP_ENV_VALIDATION=1`**: Use this env var to bypass `@t3-oss/env-nextjs` strict validation when env vars are incomplete.
- **Turbopack cache corruption**: If the dev server panics on startup with "Failed to restore task data", delete `.next/` directory and restart.
- **Stale dev server lock**: If `pnpm dev` fails with "Unable to acquire lock at .next/dev/lock", kill any orphan `next-server` processes and remove `.next/dev/lock`.
- **Proxy (not middleware)**: Auth runs in `src/proxy.ts` (Next.js 16 proxy, Node.js runtime), not Edge middleware. It allows all `/api/*` routes through without auth.
- **Cron endpoint**: `/api/cron/prices` requires `Authorization: Bearer $CRON_SECRET` header. The Ecotrust external API (`NEXT_PUBLIC_ECOTRUST_API_URL`) may be unreachable from cloud VMs — the cron 500 on fetch failure is expected in dev.
- **Telegram Login Widget**: The login page shows "Bot domain invalid" in local dev because the Telegram Widget requires a domain registered with BotFather. This is expected behavior.
- **`--inspect` flag**: `pnpm dev` includes `--inspect` for Node.js debugger. If port 9229 is already in use, the "Starting inspector failed" warning is harmless.
- **Git hooks**: Husky hooks run `lint-staged` (pre-commit), `commitlint` (commit-msg), and `pnpm typecheck` (pre-push). Use conventional commit messages.
