import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifyCronAuth } from '@/server/cron/auth'
import { runPortfolioCron } from '@/server/cron/portfolio-snapshot'
import { db } from '@/server/db'

export async function GET(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  try {
    const result = await runPortfolioCron(db)

    return NextResponse.json({
      success: true,
      portfolioSnapshotCount: result.portfolioSnapshotCount,
      portfolioAlertsTriggered: result.portfolioAlertsTriggered,
      digestsSent: result.digestsSent,
      messageSent: result.messageSent,
      messageFailed: result.messageFailed,
      prunedPortfolio: result.prunedPortfolio,
    })
  } catch (error) {
    console.error('[CRON:PORTFOLIO] Portfolio cron failed:', error)
    return NextResponse.json(
      { error: 'Portfolio cron failed' },
      { status: 500 },
    )
  }
}
