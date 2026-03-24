# Cron scheduling (production)

Production uses **[cron-job.org](https://cron-job.org)** to invoke the app’s cron HTTP routes. **Vercel Cron is not used** — the Hobby plan only allows [once-per-day cron jobs](https://vercel.com/docs/cron-jobs/usage-and-pricing), and we need more frequent price snapshots for alerts and fresher data.

`vercel.json` in this repo is intentionally empty (`{}`); it does not define a `crons` array.

## Endpoints (replace base URL if you use a custom domain)

All jobs use **GET** and the same auth header.

| Job | URL | Cron expression (UTC) | Purpose |
|-----|-----|------------------------|---------|
| Prices | `https://cheghadr.vercel.app/api/cron/prices` | `*/30 6-22 * * *` | Ecotrust fetch, `PriceSnapshot`, price alerts, prune old price snapshots |
| Portfolio | `https://cheghadr.vercel.app/api/cron/portfolio` | `30 3 * * *` | Portfolio snapshots, portfolio alerts, digests, prune old portfolio snapshots |

**Header (each job):** `Authorization: Bearer <CRON_SECRET>` — same value as the `CRON_SECRET` environment variable in Vercel.

You can lower price frequency (e.g. daily) by editing the cron expression in cron-job.org; the client refetch interval in code may then feel ahead of server data.

## Manual / local checks

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://cheghadr.vercel.app/api/cron/prices"
curl -sS -H "Authorization: Bearer $CRON_SECRET" "https://cheghadr.vercel.app/api/cron/portfolio"
```

## Not scheduled: `/api/bot/setup`

Webhook registration (`POST /api/bot/setup`) is **on-demand** only. Do not add it as a recurring cron job; it uses `drop_pending_updates: true` and would clear the Telegram update queue on every run.

## See also

- `docs/v2-phase-a-plan.md` §11 — cron architecture (routes and intended behavior)
- `src/server/cron/auth.ts` — `CRON_SECRET` validation
