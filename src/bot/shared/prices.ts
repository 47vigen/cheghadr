import type { PriceItem } from '@/lib/prices'
import { db } from '@/server/db'
import { getCachedPriceSnapshot } from '@/server/price-cache'

/** Fetch the latest price snapshot and parse it. Shared across bot screens. */
export async function getLatestPrices(): Promise<PriceItem[]> {
  const cached = await getCachedPriceSnapshot(db)
  return cached?.prices ?? []
}
