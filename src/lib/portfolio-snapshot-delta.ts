import { TZDate } from '@date-fns/tz'
import type { PrismaClient } from '@prisma/client'
import { addDays, addMonths } from 'date-fns'

import { computeAssetValueIRT, getSellPriceBySymbol } from '@/lib/prices'
import { resolveOwnedPortfolioFilter } from '@/server/api/helpers'
import { getCachedPriceSnapshot } from '@/server/price-cache'

export type PortfolioDeltaWindow = '1D' | '1W' | '1M' | 'ALL'

/**
 * Instant to compare against for portfolio delta / biggest mover, using calendar
 * arithmetic in `timeZone` (aligned with `portfolio.history` chart windows).
 */
export function getComparisonInstantForWindowInTimeZone(
  window: PortfolioDeltaWindow,
  timeZone: string,
): Date | null {
  if (window === 'ALL') return null
  const now = new TZDate(Date.now(), timeZone)
  switch (window) {
    case '1D':
      return addDays(now, -1)
    case '1W':
      return addDays(now, -7)
    case '1M':
      return addMonths(now, -1)
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
  timeZone = 'UTC',
): Promise<PortfolioSnapshotDeltaResult | null> {
  const portfolioFilter = await resolveOwnedPortfolioFilter(
    db,
    userId,
    portfolioId,
  )

  const whereClause = portfolioFilter.portfolioId
    ? { userId, portfolioId: portfolioFilter.portfolioId }
    : { userId }

  const [userAssets, cached] = await Promise.all([
    db.userAsset.findMany({ where: whereClause }),
    getCachedPriceSnapshot(db),
  ])

  if (userAssets.length === 0 || !cached) return null

  let currentIRT = 0
  for (const asset of userAssets) {
    const sellPrice = getSellPriceBySymbol(asset.symbol, cached.prices)
    currentIRT += computeAssetValueIRT(Number(asset.quantity), sellPrice)
  }

  const comparisonDate = getComparisonInstantForWindowInTimeZone(
    window,
    timeZone,
  )

  const atOrBefore = comparisonDate
    ? await db.portfolioSnapshot.findFirst({
        where: {
          userId,
          ...portfolioFilter,
          snapshotAt: { lte: comparisonDate },
        },
        orderBy: { snapshotAt: 'desc' },
        select: { id: true, snapshotAt: true, totalIRT: true },
      })
    : null

  const earliest = await db.portfolioSnapshot.findFirst({
    where: { userId, ...portfolioFilter },
    orderBy: { snapshotAt: 'asc' },
    select: { id: true, snapshotAt: true, totalIRT: true },
  })

  const previous = atOrBefore ?? earliest

  if (!previous) return null

  const previousIRT = Number(previous.totalIRT)
  const deltaIRT = currentIRT - previousIRT
  const deltaPct = previousIRT !== 0 ? (deltaIRT / previousIRT) * 100 : 0

  return { currentIRT, previousIRT, deltaIRT, deltaPct }
}
