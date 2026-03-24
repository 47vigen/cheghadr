# Cheghadr? (چه‌قدر؟)

[![CI](https://img.shields.io/github/actions/workflow/status/47vigen/cheghadr/ci.yml?branch=production&logo=github&label=CI&style=for-the-badge)](https://github.com/47vigen/cheghadr/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/47vigen/cheghadr?style=for-the-badge)](https://github.com/47vigen/cheghadr/blob/master/LICENSE)
[![Telegram Mini App](https://img.shields.io/badge/Telegram-Mini_App-26A5E4?logo=telegram&logoColor=white&style=for-the-badge)](https://t.me/CheghadrAppBot/app)
[![Telegram Bot](https://img.shields.io/badge/Telegram-%40CheghadrAppBot-26A5E4?logo=telegram&logoColor=white&style=for-the-badge)](https://t.me/CheghadrAppBot)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white&style=for-the-badge)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-11-2596BE?logo=trpc&logoColor=white&style=for-the-badge)](https://trpc.io/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-5-FF4154?logo=reactquery&logoColor=white&style=for-the-badge)](https://tanstack.com/query/latest)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![Neon](https://img.shields.io/badge/Neon-00E5BF?logo=neon&logoColor=black&style=for-the-badge)](https://neon.tech)
[![NextAuth.js](https://img.shields.io/badge/NextAuth.js-5-000000?logo=nextauth&logoColor=white&style=for-the-badge)](https://next-auth.js.org/)
[![HeroUI](https://img.shields.io/badge/HeroUI-v3-006FEE?style=for-the-badge)](https://heroui.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-3-8884D8?style=for-the-badge&logo=recharts&logoColor=white)](https://recharts.org/)
[![Jotai](https://img.shields.io/badge/Jotai-2-000000?logo=jotai&logoColor=white&style=for-the-badge)](https://jotai.org/)
[![next-intl](https://img.shields.io/badge/next--intl-4-000000?style=for-the-badge)](https://next-intl.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-4-6E9F18?logo=vitest&logoColor=white&style=for-the-badge)](https://vitest.dev/)
[![Testing Library](https://img.shields.io/badge/Testing_Library-16-E33332?logo=testinglibrary&logoColor=white&style=for-the-badge)](https://testing-library.com/)
[![Biome](https://img.shields.io/badge/Biome-2-60A5FA?logo=biome&logoColor=white&style=for-the-badge)](https://biomejs.dev/)
[![Telegram Apps](https://img.shields.io/badge/Telegram_Apps-SDK-26A5E4?logo=telegram&logoColor=white&style=for-the-badge)](https://docs.telegram-mini-apps.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white&style=for-the-badge)](https://vercel.com)

**Personal net worth tracker** available as a Telegram Mini App and a standalone web application.

Track your assets, monitor prices, visualize portfolio performance, and set price alerts.

## Features

- **Portfolio management** — Create named portfolios, add assets with quantities
- **Real-time & historical prices** — Daily snapshots from [Ecotrust](https://ecotrust.ir), visualized with charts
- **Price alerts** — Set threshold alerts and get notified when prices move
- **Net worth breakdown** — See your portfolio split by asset category
- **Telegram Mini App** — Works natively inside Telegram on mobile — [open app](https://t.me/CheghadrAppBot/app)
- **Standalone web app** — Also runs as a regular browser app with Telegram login widget
- **English + Persian** — next-intl with RTL when the active locale is `fa`

## Telegram

- **Bot:** [@CheghadrAppBot](https://t.me/CheghadrAppBot)
- **Mini App:** [Open in Telegram](https://t.me/CheghadrAppBot/app)

---

## Tech Stack

| Layer     | Technology                              |
| --------- | --------------------------------------- |
| Framework | Next.js 16 (App Router, Turbopack)      |
| Language  | TypeScript 5 (strict)                   |
| API       | tRPC v11 + TanStack React Query v5      |
| Database  | Prisma 7 + Neon (serverless PostgreSQL) |
| Auth      | NextAuth v5 (Telegram strategy)         |
| UI        | HeroUI v3 + Tailwind CSS v4             |
| Charts    | Recharts                                |
| State     | Jotai                                   |
| i18n      | next-intl                               |
| Testing   | Vitest + Testing Library                |
| Linting   | Biome                                   |
| Telegram  | @telegram-apps/sdk                      |

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

| Variable                            | Description                                                                            | Required |
| ----------------------------------- | -------------------------------------------------------------------------------------- | -------- |
| `DATABASE_URL`                      | Neon PostgreSQL connection string (pooled)                                             | Yes      |
| `DIRECT_URL`                        | Neon direct connection (for migrations)                                                | No       |
| `NEXTAUTH_SECRET`                   | Random secret, min 32 chars — `openssl rand -base64 32`                                | Yes      |
| `NEXTAUTH_URL`                      | App URL — `http://localhost:3000` for local dev                                        | Yes      |
| `TELEGRAM_BOT_TOKEN`                | Bot token from @BotFather                                                              | Yes      |
| `CRON_SECRET`                       | Random secret; external scheduler must send `Authorization: Bearer …` to `/api/cron/*` | Yes      |
| `NEXT_PUBLIC_ECOTRUST_API_URL`      | Ecotrust price API base URL                                                            | Yes      |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Bot username from @BotFather (without @)                                               | Yes      |
| `DEV_TELEGRAM_USER_ID`              | Development only: bypass Telegram auth with this user ID                               | No       |
| `SKIP_ENV_VALIDATION`               | Set to `1` to skip env validation (CI, Docker)                                         | No       |

---

## Scripts

| Script             | Description                                          |
| ------------------ | ---------------------------------------------------- |
| `pnpm dev`         | Start development server (Turbopack + Node debugger) |
| `pnpm build`       | Build for production                                 |
| `pnpm start`       | Start production server                              |
| `pnpm check`       | Run typecheck + lint                                 |
| `pnpm typecheck`   | TypeScript type check                                |
| `pnpm lint`        | Biome lint                                           |
| `pnpm lint:fix`    | Biome lint with auto-fix                             |
| `pnpm test`        | Run unit tests                                       |
| `pnpm test:watch`  | Run tests in watch mode                              |
| `pnpm db:push`     | Sync Prisma schema to database                       |
| `pnpm db:migrate`  | Run Prisma migrations (dev)                          |
| `pnpm db:studio`   | Open Prisma Studio                                   |
| `pnpm db:seed`     | Seed the database                                    |
| `pnpm swagger:gen` | Regenerate Ecotrust API types from OpenAPI spec      |

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
├── migrations/           # SQL migrations (e.g. default column changes)
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
