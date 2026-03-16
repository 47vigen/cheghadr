import type { PortfolioSnapshot, PrismaClient } from '@prisma/client'

import { findBySymbol, parsePriceSnapshot } from '@/lib/prices'

const DEDUP_WINDOW_MINUTES = 5

/**
 * Creates a PortfolioSnapshot for a user based on their current assets and
 * the latest price snapshot. Returns null when:
 * - The user has no assets
 * - No price snapshot exists
 * - A snapshot was already created within the deduplication window (5 min)
 */
export async function createPortfolioSnapshot(
  db: PrismaClient,
  userId: string,
): Promise<PortfolioSnapshot | null> {
  const [userAssets, priceSnapshot] = await Promise.all([
    db.userAsset.findMany({ where: { userId } }),
    db.priceSnapshot.findFirst({ orderBy: { snapshotAt: 'desc' } }),
  ])

  if (userAssets.length === 0 || !priceSnapshot) {
    return null
  }

  // Skip if a snapshot already exists within the deduplication window
  const dedupSince = new Date()
  dedupSince.setMinutes(dedupSince.getMinutes() - DEDUP_WINDOW_MINUTES)
  const recent = await db.portfolioSnapshot.findFirst({
    where: { userId, snapshotAt: { gte: dedupSince } },
  })
  if (recent) return null

  const prices = parsePriceSnapshot(priceSnapshot.data)

  const breakdown: Array<{ symbol: string; quantity: number; valueIRT: number }> =
    []
  let totalIRT = 0

  for (const asset of userAssets) {
    const priceItem = findBySymbol(prices, asset.symbol)
    const sellPrice = priceItem ? Number(priceItem.sell_price) : 0
    const qty = Number(asset.quantity)
    const valueIRT = qty * sellPrice
    totalIRT += valueIRT
    breakdown.push({ symbol: asset.symbol, quantity: qty, valueIRT })
  }

  return db.portfolioSnapshot.create({
    data: { userId, totalIRT, breakdown },
  })
}
