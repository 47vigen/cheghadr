import type { PrismaClient } from '@prisma/client'

import { getSellPriceBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { resolveOwnedPortfolioFilter } from '@/server/api/helpers'

export type PortfolioDeltaWindow = '1D' | '1W' | '1M' | 'ALL'

export function getComparisonDateForWindow(
  window: PortfolioDeltaWindow,
): Date | null {
  const now = new Date()
  switch (window) {
    case '1D':
      now.setDate(now.getDate() - 1)
      return now
    case '1W':
      now.setDate(now.getDate() - 7)
      return now
    case '1M':
      now.setMonth(now.getMonth() - 1)
      return now
    case 'ALL':
      return null
    default:
      return null
  }
}

export interface PortfolioSnapshotDeltaResult {
  currentIRT: number
  previousIRT: number
  deltaIRT: number
  deltaPct: number
}

/**
 * Delta between live portfolio value (current holdings × latest prices) and a
 * historical snapshot comparison point (`portfolio.delta` tRPC).
 */
export async function getPortfolioSnapshotDelta(
  db: PrismaClient,
  userId: string,
  window: PortfolioDeltaWindow,
  portfolioId?: string,
): Promise<PortfolioSnapshotDeltaResult | null> {
  const portfolioFilter = await resolveOwnedPortfolioFilter(
    db,
    userId,
    portfolioId,
  )

  const whereClause = portfolioId
    ? { userId, portfolioId }
    : { userId }

  const [userAssets, priceSnapshot] = await Promise.all([
    db.userAsset.findMany({ where: whereClause }),
    db.priceSnapshot.findFirst({ orderBy: { snapshotAt: 'desc' } }),
  ])

  if (userAssets.length === 0 || !priceSnapshot) return null

  const prices = parsePriceSnapshot(priceSnapshot.data)
  let currentIRT = 0
  for (const asset of userAssets) {
    const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
    currentIRT += Number(asset.quantity) * sellPrice
  }

  const comparisonDate = getComparisonDateForWindow(window)

  const previous = comparisonDate
    ? await db.portfolioSnapshot.findFirst({
        where: {
          userId,
          ...portfolioFilter,
          snapshotAt: { lte: comparisonDate },
        },
        orderBy: { snapshotAt: 'desc' },
        select: { id: true, snapshotAt: true, totalIRT: true },
      })
    : await db.portfolioSnapshot.findFirst({
        where: { userId, ...portfolioFilter },
        orderBy: { snapshotAt: 'asc' },
        select: { id: true, snapshotAt: true, totalIRT: true },
      })

  if (!previous) return null

  const previousIRT = Number(previous.totalIRT)
  const deltaIRT = currentIRT - previousIRT
  const deltaPct = previousIRT !== 0 ? (deltaIRT / previousIRT) * 100 : 0

  return { currentIRT, previousIRT, deltaIRT, deltaPct }
}
