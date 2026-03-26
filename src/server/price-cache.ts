import type { PrismaClient } from '@prisma/client'

import { type PriceItem, parsePriceSnapshot } from '@/lib/prices'

export interface CachedPriceSnapshot {
  snapshotAt: Date
  data: unknown
  prices: PriceItem[]
}

const CACHE_TTL_MS = 60_000

let cache: (CachedPriceSnapshot & { expiresAt: number }) | null = null

/** Immediately expires the in-memory price cache (call after writing a new PriceSnapshot). */
export function invalidatePriceCache(): void {
  cache = null
}

/**
 * Returns the latest price snapshot with pre-parsed prices, served from a
 * 60-second in-memory TTL cache. All routers and cron jobs should use this
 * instead of querying `priceSnapshot` directly.
 */
export async function getCachedPriceSnapshot(
  db: PrismaClient,
): Promise<CachedPriceSnapshot | null> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache

  const row = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  if (!row) return null

  cache = {
    snapshotAt: row.snapshotAt,
    data: row.data,
    prices: parsePriceSnapshot(row.data),
    expiresAt: now + CACHE_TTL_MS,
  }
  return cache
}
