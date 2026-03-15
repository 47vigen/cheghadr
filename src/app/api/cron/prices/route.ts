import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { db } from '@/server/db'

const ECOTRUST_API_URL = process.env.NEXT_PUBLIC_ECOTRUST_API_URL

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends this as a Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Prune snapshots older than 90 days
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count } = await db.priceSnapshot.deleteMany({
      where: { snapshotAt: { lt: ninetyDaysAgo } },
    })

    return NextResponse.json({
      success: true,
      assetsCount: data.data.length,
      prunedCount: count,
    })
  } catch (error) {
    console.error('[CRON] Price snapshot failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 },
    )
  }
}
