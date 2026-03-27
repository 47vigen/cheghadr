/** Default refetch interval for market-related tRPC queries (30 minutes). */
export const TRPC_REFETCH_INTERVAL_MS = 30 * 60 * 1000

/** Refetch interval for live price data (30 minutes — matches price-snapshot cron cadence). */
export const REFETCH_PRICES_MS = 30 * 60 * 1000

/** Refetch interval for user asset lists (30 minutes — values change with price snapshots). */
export const REFETCH_ASSETS_MS = 30 * 60 * 1000

/** Refetch interval for portfolio history / breakdown / delta (60 minutes — snapshots change less frequently). */
export const REFETCH_PORTFOLIO_MS = 60 * 60 * 1000

/** Refetch interval for alerts (60 minutes — alert state changes only on user action or trigger). */
export const REFETCH_ALERTS_MS = 60 * 60 * 1000
