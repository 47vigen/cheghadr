import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { dailyDigestMessage, portfolioAlertMessage } from '@/lib/alert-messages'
import { hasCrossedThreshold } from '@/lib/alert-utils'
import { NotificationQueue } from '@/lib/notifications'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import { getSellPriceBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { db } from '@/server/db'

const YESTERDAY_CUTOFF_MS = 23 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  // Explicit guard: prevents "Bearer undefined" bypass when secret is unset
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON:PORTFOLIO] CRON_SECRET is not configured')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Create portfolio snapshots for all active users
    const activeUsers = await db.user.findMany({
      where: { assets: { some: {} } },
      select: { id: true, telegramUserId: true, dailyDigestEnabled: true },
    })

    let portfolioSnapshotCount = 0
    for (const user of activeUsers) {
      const snap = await createPortfolioSnapshot(db, user.id)
      if (snap) portfolioSnapshotCount++
    }

    // Evaluate PORTFOLIO alerts
    const queue = new NotificationQueue()
    const triggeredAlertIds: string[] = []

    const portfolioAlerts = await db.alert.findMany({
      where: { type: 'PORTFOLIO', isActive: true },
      include: { user: { select: { telegramUserId: true, id: true } } },
    })

    for (const alert of portfolioAlerts) {
      const [currentSnap, previousSnap] = await Promise.all([
        db.portfolioSnapshot.findFirst({
          where: { userId: alert.userId },
          orderBy: { snapshotAt: 'desc' },
          select: { id: true, totalIRT: true, snapshotAt: true },
        }),
        db.portfolioSnapshot.findFirst({
          where: {
            userId: alert.userId,
            snapshotAt: { lt: new Date(Date.now() - YESTERDAY_CUTOFF_MS) },
          },
          orderBy: { snapshotAt: 'desc' },
          select: { id: true, totalIRT: true },
        }),
      ])

      if (!currentSnap || !previousSnap) continue

      const currentIRT = Number(currentSnap.totalIRT)
      const previousIRT = Number(previousSnap.totalIRT)
      const threshold = Number(alert.thresholdIRT)

      const triggered = hasCrossedThreshold(
        previousIRT,
        currentIRT,
        alert.direction,
        threshold,
      )

      if (triggered) {
        const text = portfolioAlertMessage(
          alert.direction,
          alert.thresholdIRT.toString(),
        )
        queue.enqueue({
          telegramUserId: alert.user.telegramUserId,
          text,
          alertId: alert.id,
        })
        triggeredAlertIds.push(alert.id)
      }
    }

    // Send daily digests for opted-in users
    const digestUsers = activeUsers.filter((u) => u.dailyDigestEnabled)
    const latestPriceSnap = await db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })

    for (const user of digestUsers) {
      const [todaySnap, yesterdaySnap] = await Promise.all([
        db.portfolioSnapshot.findFirst({
          where: { userId: user.id },
          orderBy: { snapshotAt: 'desc' },
          select: { totalIRT: true, breakdown: true },
        }),
        db.portfolioSnapshot.findFirst({
          where: {
            userId: user.id,
            snapshotAt: { lt: new Date(Date.now() - YESTERDAY_CUTOFF_MS) },
          },
          orderBy: { snapshotAt: 'desc' },
          select: { totalIRT: true },
        }),
      ])

      if (!todaySnap || !yesterdaySnap) continue

      const currentIRT = Number(todaySnap.totalIRT)
      const previousIRT = Number(yesterdaySnap.totalIRT)
      const deltaPct =
        previousIRT !== 0
          ? (((currentIRT - previousIRT) / previousIRT) * 100).toFixed(2)
          : '0.00'

      // Find biggest mover
      let topMoverName = ''
      if (latestPriceSnap && Array.isArray(todaySnap.breakdown)) {
        const prices = parsePriceSnapshot(latestPriceSnap.data)
        type BreakdownItem = { symbol: string; quantity: number; valueIRT: number }
        const breakdown = todaySnap.breakdown as BreakdownItem[]
        let maxValue = 0
        for (const item of breakdown) {
          const price = getSellPriceBySymbol(item.symbol, prices)
          const value = item.quantity * price
          if (value > maxValue) {
            maxValue = value
            const priceItem = prices.find(
              (p) => p.base_currency.symbol === item.symbol,
            )
            topMoverName = priceItem?.name.fa ?? item.symbol
          }
        }
      }

      const text = dailyDigestMessage(deltaPct, topMoverName)
      queue.enqueue({
        telegramUserId: user.telegramUserId,
        text,
        alertId: `digest-${user.id}`,
      })
    }

    const { sent, failed } = await queue.drain()

    if (triggeredAlertIds.length > 0) {
      await db.alert.updateMany({
        where: { id: { in: triggeredAlertIds } },
        data: { isActive: false, triggeredAt: new Date() },
      })
    }

    // Prune portfolio snapshots older than 365 days
    const yearAgo = new Date()
    yearAgo.setDate(yearAgo.getDate() - 365)
    const { count: prunedPortfolio } = await db.portfolioSnapshot.deleteMany({
      where: { snapshotAt: { lt: yearAgo } },
    })

    console.log(
      `[CRON:PORTFOLIO] Snapshots: ${portfolioSnapshotCount}, Portfolio alerts triggered: ${triggeredAlertIds.length}, Digests sent: ${digestUsers.length}, Sent: ${sent}, Failed: ${failed}`,
    )

    return NextResponse.json({
      success: true,
      portfolioSnapshotCount,
      portfolioAlertsTriggered: triggeredAlertIds.length,
      digestsSent: digestUsers.length,
      messageSent: sent,
      messageFailed: failed,
      prunedPortfolio,
    })
  } catch (error) {
    console.error('[CRON:PORTFOLIO] Portfolio cron failed:', error)
    return NextResponse.json(
      { error: 'Portfolio cron failed' },
      { status: 500 },
    )
  }
}
