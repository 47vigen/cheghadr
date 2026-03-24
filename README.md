# Cheghadr? (چه‌قدر؟)

**Persian (RTL) personal net worth tracker** — available as a Telegram Mini App and a standalone web application.

Track your assets, monitor prices, visualize portfolio performance, and set price alerts — all in Farsi with full RTL support.

---

## Features

- **Portfolio management** — Create named portfolios, add assets with quantities
- **Real-time & historical prices** — Daily snapshots from [Ecotrust](https://ecotrust.ir), visualized with charts
- **Price alerts** — Set threshold alerts and get notified when prices move
- **Net worth breakdown** — See your portfolio split by asset category
- **Telegram Mini App** — Works natively inside Telegram on mobile
- **Standalone web app** — Also runs as a regular browser app with Telegram login widget
- **Farsi / RTL** — Fully localized in Persian with RTL layout

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| API | tRPC v11 + TanStack React Query v5 |
| Database | Prisma 7 + Neon (serverless PostgreSQL) |
| Auth | NextAuth v5 (Telegram strategy) |
| UI | HeroUI v3 + Tailwind CSS v4 |
| Charts | Recharts |
| State | Jotai |
| i18n | next-intl |
| Testing | Vitest + Testing Library |
| Linting | Biome |
| Telegram | @telegram-apps/sdk |

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- A **Neon** PostgreSQL database ([neon.tech](https://neon.tech) — free tier works)
- A **Telegram Bot** created via [@BotFather](https://t.me/BotFather)

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/47vigen/cheghadr.git
cd cheghadr

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your values (see Environment Variables section below)

# 4. Push the database schema
pnpm db:push

# 5. Start the development server
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

> **Telegram login widget** will show "Bot domain invalid" in local dev — this is expected. Use `DEV_TELEGRAM_USER_ID` in `.env` to bypass authentication during development.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string (pooled) | Yes |
| `DIRECT_URL` | Neon direct connection (for migrations) | No |
| `NEXTAUTH_SECRET` | Random secret, min 32 chars — `openssl rand -base64 32` | Yes |
| `NEXTAUTH_URL` | App URL — `http://localhost:3000` for local dev | Yes |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather | Yes |
| `CRON_SECRET` | Random secret; external scheduler must send `Authorization: Bearer …` to `/api/cron/*` | Yes |
| `NEXT_PUBLIC_ECOTRUST_API_URL` | Ecotrust price API base URL | Yes |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username from @BotFather (without @) | Yes |
| `DEV_TELEGRAM_USER_ID` | Development only: bypass Telegram auth with this user ID | No |
| `SKIP_ENV_VALIDATION` | Set to `1` to skip env validation (CI, Docker) | No |

---

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server (Turbopack + Node debugger) |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm check` | Run typecheck + lint |
| `pnpm typecheck` | TypeScript type check |
| `pnpm lint` | Biome lint |
| `pnpm lint:fix` | Biome lint with auto-fix |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:push` | Sync Prisma schema to database |
| `pnpm db:migrate` | Run Prisma migrations (dev) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed the database |
| `pnpm swagger:gen` | Regenerate Ecotrust API types from OpenAPI spec |

---

## Project Structure

```
src/
├── app/                  # Next.js App Router pages and API routes
│   ├── (app)/            # Authenticated route group
│   └── api/
│       ├── auth/         # NextAuth route
│       ├── cron/         # Cron HTTP routes (prices, portfolio); production triggered via cron-job.org
│       └── trpc/         # tRPC endpoint
├── components/           # Feature-based UI components
├── server/               # Backend: tRPC routers, auth, cron jobs, DB
├── trpc/                 # React Query + tRPC client setup
├── providers/            # React context providers
├── hooks/                # Custom React hooks
├── lib/                  # Domain utilities (prices, alerts, formatting)
├── types/                # Shared TypeScript types and Zod schemas
└── styles/               # Global CSS and theme variables
prisma/
├── schema.prisma         # Data model
└── seed.ts               # Database seed script
docs/
├── cron-scheduling.md    # Production cron-job.org URLs, schedules, auth
└── phase-1-plan.md       # Architecture and product context
```

### Production cron

Schedulers call **`/api/cron/prices`** and **`/api/cron/portfolio`** with **`Authorization: Bearer $CRON_SECRET`**. We use **[cron-job.org](https://cron-job.org)** instead of Vercel Cron. Full table and expressions: [`docs/cron-scheduling.md`](docs/cron-scheduling.md).

---

## Adding UI Primitives

This project uses **HeroUI** (not shadcn/ui). For new primitives, follow existing patterns under `src/components/ui/` and refer to the [HeroUI documentation](https://heroui.com).

---

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## Acknowledgments

This project uses price data provided by **[Ecotrust](https://ecotrust.ir)** (اکوتراست). We gratefully acknowledge their API service which powers the real-time and historical price features in this app. Ecotrust retains full copyright and ownership of their data and API. Please respect their [terms of service](https://ecotrust.ir) when using or forking this project.

---

## Security

To report a security vulnerability, please see [SECURITY.md](SECURITY.md). Do **not** open a public GitHub issue for security concerns.

---

## License

This project is licensed under the [MIT License](LICENSE) — Copyright (c) 2026 47vigen
