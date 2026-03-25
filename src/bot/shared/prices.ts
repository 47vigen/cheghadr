import { type PriceItem, parsePriceSnapshot } from '@/lib/prices'
import { db } from '@/server/db'

/** Fetch the latest price snapshot and parse it. Shared across screens & wizards. */
export async function getLatestPrices(): Promise<PriceItem[]> {
  const snap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  return snap ? parsePriceSnapshot(snap.data) : []
}
