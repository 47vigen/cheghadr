import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createPortfolioSnapshot } from '@/lib/portfolio'
import { db } from '@/server/db'

const ECOTRUST_API_URL = process.env.NEXT_PUBLIC_ECOTRUST_API_URL

export async function GET(request: NextRequest) {
  // Explicit guard: prevents "Bearer undefined" bypass when secret is unset
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify cron secret — Vercel sends this as a Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

    await db.priceSnapshot.create({
      data: { data: data as object },
    })

    // Prune price snapshots older than 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count: prunedPrices } = await db.priceSnapshot.deleteMany({
      where: { snapshotAt: { lt: ninetyDaysAgo } },
    })

    // Create daily portfolio snapshots for all active users
    const activeUsers = await db.user.findMany({
      where: { assets: { some: {} } },
      select: { id: true },
    })

    let portfolioSnapshotCount = 0
    for (const user of activeUsers) {
      const snap = await createPortfolioSnapshot(db, user.id)
      if (snap) portfolioSnapshotCount++
    }

    // Prune portfolio snapshots older than 365 days
    const yearAgo = new Date()
    yearAgo.setDate(yearAgo.getDate() - 365)
    await db.portfolioSnapshot.deleteMany({
      where: { snapshotAt: { lt: yearAgo } },
    })

    return NextResponse.json({
      success: true,
      assetsCount: data.data.length,
      prunedCount: prunedPrices,
      portfolioSnapshotCount,
    })
  } catch (error) {
    console.error('[CRON] Price snapshot failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 },
    )
  }
}
