# Cheghadr? (چه‌قدر؟)

Persian (RTL) personal net worth tracker: Telegram Mini App and standalone web app. Stack: **Next.js 16** (App Router, Turbopack), **tRPC v11**, **Prisma 7** + Neon Postgres, **NextAuth v5** (Telegram), **HeroUI** + Tailwind CSS v4.

## Docs

- **[AGENTS.md](AGENTS.md)** — commands, env gotchas, and repo conventions for agents and contributors.
- **[docs/phase-1-plan.md](docs/phase-1-plan.md)** — architecture and product context.

## Scripts

See `package.json` for the full list. Common tasks: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm db:push`, `pnpm check`.

## Adding UI primitives

This project uses HeroUI, not shadcn. For new primitives, follow existing patterns under `src/components/ui/` and HeroUI docs.
