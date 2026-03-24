import type { PrismaClient } from '@prisma/client'

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
 * Delta between latest portfolio snapshot and a comparison point (same logic as
 * `portfolio.delta` tRPC).
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

  const current = await db.portfolioSnapshot.findFirst({
    where: { userId, ...portfolioFilter },
    orderBy: { snapshotAt: 'desc' },
    select: { id: true, snapshotAt: true, totalIRT: true },
  })

  if (!current) return null

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

  if (!previous || previous.id === current.id) return null

  const currentIRT = Number(current.totalIRT)
  const previousIRT = Number(previous.totalIRT)
  const deltaIRT = currentIRT - previousIRT
  const deltaPct = previousIRT !== 0 ? (deltaIRT / previousIRT) * 100 : 0

  return { currentIRT, previousIRT, deltaIRT, deltaPct }
}
