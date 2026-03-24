# Contributing to Cheghadr

Thank you for your interest in contributing! Here is everything you need to get started.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- A **Neon** PostgreSQL database ([neon.tech](https://neon.tech) — free tier works)
- A **Telegram Bot** created via [@BotFather](https://t.me/BotFather)

---

## Local Setup

```bash
git clone https://github.com/47vigen/cheghadr.git
cd cheghadr
pnpm install
cp .env.example .env
# Fill in .env — see README.md for variable descriptions
pnpm db:push
pnpm dev
```

> Set `DEV_TELEGRAM_USER_ID` in `.env` to your Telegram user ID to bypass authentication in local development.

---

## Branch Naming

Branch from `production` and use a descriptive name:

```
feat/add-dark-mode
fix/alert-trigger-bug
chore/update-dependencies
```

---

## Commit Messages

This project enforces **Conventional Commits** via commitlint. Every commit message must follow:

```
<type>(<optional scope>): <short description>
```

Allowed types:

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style / formatting (no logic change) |
| `refactor` | Refactor without new feature or bug fix |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks (deps, tooling) |
| `revert` | Reverting a previous commit |

Examples:

```
feat(alerts): add portfolio threshold alerts
fix(auth): handle expired telegram initData
docs: update environment variable table
```

The pre-commit and pre-push hooks (Husky) will validate your commits automatically.

---

## Code Style

This project uses **Biome** for both formatting and linting.

```bash
# Check everything
pnpm check

# Auto-fix lint and formatting issues
pnpm lint:fix
```

Biome runs automatically on staged files before each commit via `lint-staged`.

---

## Testing

Run the full test suite before opening a PR:

```bash
pnpm test
```

- Tests live in `src/**/__tests__/` directories
- Coverage targets: **70% lines/functions**, **60% branches**
- Add or update tests for any logic you change

---

## Pull Request Process

1. **Open a draft PR** early if you want feedback before finishing
2. Make sure `pnpm check` and `pnpm test` both pass locally
3. Fill in the PR template — link the related issue and describe your changes
4. Request a review when ready
5. PRs are squash-merged into `production`

---

## Dev Gotchas

| Symptom | Fix |
|---|---|
| `Failed to restore task data` in dev server | Delete `.next/` and restart |
| `pnpm dev` fails with lock error | Kill orphaned `next-server` processes |
| Telegram login widget shows "Bot domain invalid" | Expected in local dev; use `DEV_TELEGRAM_USER_ID` |
| `/api/cron/*` returns 500 | Ecotrust API may be unreachable from your machine; expected in dev |
| Where production crons run | **cron-job.org** (not Vercel Cron) — see `docs/cron-scheduling.md` |
| Env validation error on startup | Ensure all required vars in `.env` are filled, or set `SKIP_ENV_VALIDATION=1` |

---

## Further Reading

- [AGENTS.md](AGENTS.md) — deeper conventions, source layout, React Query persistence strategy, and tooling notes for AI-assisted development
- [docs/phase-1-plan.md](docs/phase-1-plan.md) — architecture decisions and product context
- [README.md](README.md) — project overview and setup

---

## Code of Conduct

By participating you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).
