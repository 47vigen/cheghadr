import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { evaluatePriceAlerts } from '@/lib/alerts/evaluation'
import { verifyCronAuth } from '@/server/cron/auth'
import { db } from '@/server/db'

const ECOTRUST_API_URL = process.env.NEXT_PUBLIC_ECOTRUST_API_URL

export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  if (!ECOTRUST_API_URL) {
    console.error('[CRON] NEXT_PUBLIC_ECOTRUST_API_URL is not configured')
    return NextResponse.json(
      { error: 'API URL not configured' },
      { status: 500 },
    )
  }

  try {
    const response = await fetch(`${ECOTRUST_API_URL}/api/prices`, {
      headers: { 'Content-Type': 'application/json' },
      // Always fetch fresh data — never use Next.js cache
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Ecotrust API returned ${response.status}`)
    }

    const data = (await response.json()) as { data?: unknown[] }

    if (!data?.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('Ecotrust API returned empty or invalid data')
    }

    // Load previous snapshot before saving the new one
    const previousSnapshot = await db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })

    const currentSnapshot = await db.priceSnapshot.create({
      data: { data: data as object },
    })

    // Evaluate price alerts (compare previous vs current prices)
    const { evaluated, triggered } = await evaluatePriceAlerts(
      db,
      currentSnapshot,
      previousSnapshot,
    )

    // Prune price snapshots older than 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count: prunedPrices } = await db.priceSnapshot.deleteMany({
      where: { snapshotAt: { lt: ninetyDaysAgo } },
    })

    return NextResponse.json({
      success: true,
      assetsCount: data.data.length,
      prunedCount: prunedPrices,
      alertsEvaluated: evaluated,
      alertsTriggered: triggered,
    })
  } catch (error) {
    console.error('[CRON] Price snapshot failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 },
    )
  }
}
