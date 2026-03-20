import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifyCronAuth } from '@/server/cron/auth'
import {
  getPriceCronConfigError,
  runPriceSnapshotCron,
} from '@/server/cron/price-snapshot'
import { db } from '@/server/db'

export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  const configError = getPriceCronConfigError()
  if (configError) {
    console.error(`[CRON] ${configError}`)
    return NextResponse.json(
      { error: 'API URL not configured' },
      { status: 500 },
    )
  }

  try {
    const result = await runPriceSnapshotCron(db)

    return NextResponse.json({
      success: true,
      assetsCount: result.assetsCount,
      prunedCount: result.prunedCount,
      alertsEvaluated: result.alertsEvaluated,
      alertsTriggered: result.alertsTriggered,
    })
  } catch (error) {
    console.error('[CRON] Price snapshot failed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 },
    )
  }
}
