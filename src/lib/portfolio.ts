import type { PortfolioSnapshot, PrismaClient } from '@prisma/client'

import { computeAssetValueIRT, getSellPriceBySymbol } from '@/lib/prices'
import { getCachedPriceSnapshot } from '@/server/price-cache'

const DEDUP_WINDOW_MINUTES = 5

/**
 * Creates a PortfolioSnapshot for a user.
 *
 * @param portfolioId - specific portfolio ID, or null for consolidated (all portfolios)
 *
 * Returns null when:
 * - The user has no assets (in the given portfolio / across all)
 * - No price snapshot exists
 * - A snapshot was already created within the deduplication window (5 min)
 */
export async function createPortfolioSnapshot(
  db: PrismaClient,
  userId: string,
  portfolioId: string | null,
): Promise<PortfolioSnapshot | null> {
  const whereClause = portfolioId ? { userId, portfolioId } : { userId }

  const [userAssets, cached] = await Promise.all([
    db.userAsset.findMany({ where: whereClause }),
    getCachedPriceSnapshot(db),
  ])

  if (userAssets.length === 0 || !cached) {
    return null
  }

  // Skip if a snapshot already exists within the deduplication window
  const dedupSince = new Date()
  dedupSince.setMinutes(dedupSince.getMinutes() - DEDUP_WINDOW_MINUTES)
  const recent = await db.portfolioSnapshot.findFirst({
    where: {
      userId,
      portfolioId: portfolioId ?? null,
      snapshotAt: { gte: dedupSince },
    },
  })
  if (recent) return null

  const breakdown: Array<{
    symbol: string
    quantity: number
    valueIRT: number
  }> = []
  let totalIRT = 0

  for (const asset of userAssets) {
    const sellPrice = getSellPriceBySymbol(asset.symbol, cached.prices)
    const qty = Number(asset.quantity)
    const valueIRT = computeAssetValueIRT(qty, sellPrice)
    totalIRT += valueIRT
    breakdown.push({ symbol: asset.symbol, quantity: qty, valueIRT })
  }

  return db.portfolioSnapshot.create({
    data: { userId, portfolioId, totalIRT, breakdown },
  })
}
