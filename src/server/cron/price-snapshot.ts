import type { PrismaClient } from '@prisma/client'

import { evaluatePriceAlerts } from '@/lib/alerts/evaluation'
import { invalidatePriceCache } from '@/server/price-cache'

const ECOTRUST_API_URL = process.env.NEXT_PUBLIC_ECOTRUST_API_URL

export interface PriceSnapshotCronResult {
  assetsCount: number
  prunedCount: number
  alertsEvaluated: number
  alertsTriggered: number
}

export function getPriceCronConfigError(): string | null {
  if (!ECOTRUST_API_URL) {
    return 'NEXT_PUBLIC_ECOTRUST_API_URL is not configured'
  }
  return null
}

export async function runPriceSnapshotCron(
  db: PrismaClient,
): Promise<PriceSnapshotCronResult> {
  const url = ECOTRUST_API_URL
  if (!url) {
    throw new Error('NEXT_PUBLIC_ECOTRUST_API_URL is not configured')
  }

  const response = await fetch(`${url}/api/prices`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Ecotrust API returned ${response.status}`)
  }

  const data = (await response.json()) as { data?: unknown[] }

  if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
    throw new Error('Ecotrust API returned empty or invalid data')
  }

  const previousSnapshot = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })

  const currentSnapshot = await db.priceSnapshot.create({
    data: { data: data as object },
  })
  invalidatePriceCache()

  const { evaluated, triggered } = await evaluatePriceAlerts(
    db,
    currentSnapshot,
    previousSnapshot,
  )

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { count: prunedPrices } = await db.priceSnapshot.deleteMany({
    where: { snapshotAt: { lt: ninetyDaysAgo } },
  })

  return {
    assetsCount: data.data.length,
    prunedCount: prunedPrices,
    alertsEvaluated: evaluated,
    alertsTriggered: triggered,
  }
}
