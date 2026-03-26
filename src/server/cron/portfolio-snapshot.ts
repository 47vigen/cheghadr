import type { PrismaClient } from '@prisma/client'

import {
  dailyDigestMessage,
  portfolioAlertMessage,
  toAlertMessageLocale,
} from '@/lib/alerts/messages'
import { hasCrossedThreshold } from '@/lib/alerts/utils'
import { NotificationQueue } from '@/lib/notifications'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import { findTopHoldingByValue } from '@/lib/portfolio-utils'
import { getCachedPriceSnapshot } from '@/server/price-cache'
import { parseBreakdownJson } from '@/types/schemas'

const YESTERDAY_CUTOFF_MS = 23 * 60 * 60 * 1000

export interface PortfolioCronResult {
  portfolioSnapshotCount: number
  portfolioAlertsTriggered: number
  digestsSent: number
  messageSent: number
  messageFailed: number
  prunedPortfolio: number
}

export async function runPortfolioCron(
  db: PrismaClient,
): Promise<PortfolioCronResult> {
  const activeUsers = await db.user.findMany({
    where: { assets: { some: {} } },
    select: {
      id: true,
      telegramUserId: true,
      dailyDigestEnabled: true,
      preferredLocale: true,
    },
  })

  // Batch-fetch all portfolios for active users in one query, then parallelize
  // snapshot creation per user — avoids the previous N+1 sequential pattern.
  const userIds = activeUsers.map((u) => u.id)
  const allPortfolios = await db.portfolio.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  })

  const portfoliosByUserId = new Map<string, { id: string }[]>()
  for (const p of allPortfolios) {
    const list = portfoliosByUserId.get(p.userId) ?? []
    list.push({ id: p.id })
    portfoliosByUserId.set(p.userId, list)
  }

  const snapshotCounts = await Promise.all(
    activeUsers.map(async (user) => {
      const portfolios = portfoliosByUserId.get(user.id) ?? []
      const results = await Promise.all([
        ...portfolios.map((p) => createPortfolioSnapshot(db, user.id, p.id)),
        createPortfolioSnapshot(db, user.id, null),
      ])
      return results.filter(Boolean).length
    }),
  )
  const portfolioSnapshotCount = snapshotCounts.reduce((a, b) => a + b, 0)

  const queue = new NotificationQueue()
  const triggeredAlertIds: string[] = []

  const portfolioAlerts = await db.alert.findMany({
    where: { type: 'PORTFOLIO', isActive: true },
    include: {
      user: {
        select: {
          telegramUserId: true,
          id: true,
          preferredLocale: true,
        },
      },
    },
  })

  for (const alert of portfolioAlerts) {
    const [currentSnap, previousSnap] = await Promise.all([
      db.portfolioSnapshot.findFirst({
        where: { userId: alert.userId, portfolioId: null },
        orderBy: { snapshotAt: 'desc' },
        select: { id: true, totalIRT: true, snapshotAt: true },
      }),
      db.portfolioSnapshot.findFirst({
        where: {
          userId: alert.userId,
          portfolioId: null,
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
        toAlertMessageLocale(alert.user.preferredLocale),
      )
      queue.enqueue({
        telegramUserId: alert.user.telegramUserId,
        text,
        alertId: alert.id,
      })
      triggeredAlertIds.push(alert.id)
    }
  }

  const digestUsers = activeUsers.filter((u) => u.dailyDigestEnabled)

  // Fetch latest prices once for all digest users via cache
  const cached = await getCachedPriceSnapshot(db)

  for (const user of digestUsers) {
    const digestLocale = toAlertMessageLocale(user.preferredLocale)
    const [todaySnap, yesterdaySnap] = await Promise.all([
      db.portfolioSnapshot.findFirst({
        where: { userId: user.id, portfolioId: null },
        orderBy: { snapshotAt: 'desc' },
        select: { totalIRT: true, breakdown: true },
      }),
      db.portfolioSnapshot.findFirst({
        where: {
          userId: user.id,
          portfolioId: null,
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

    const breakdown = parseBreakdownJson(todaySnap.breakdown)
    const topMoverName = cached
      ? findTopHoldingByValue(breakdown, cached.prices, digestLocale)
      : ''

    const text = dailyDigestMessage(deltaPct, topMoverName, digestLocale)
    queue.enqueue({
      telegramUserId: user.telegramUserId,
      text,
      alertId: `digest-${user.id}`,
    })
  }

  const { sent, failed, succeededAlertIds } = await queue.drain()

  const portfolioAlertIdsToDeactivate = triggeredAlertIds.filter((id) =>
    succeededAlertIds.includes(id),
  )
  if (portfolioAlertIdsToDeactivate.length > 0) {
    await db.alert.updateMany({
      where: { id: { in: portfolioAlertIdsToDeactivate } },
      data: { isActive: false, triggeredAt: new Date() },
    })
  }

  const yearAgo = new Date()
  yearAgo.setDate(yearAgo.getDate() - 365)
  const { count: prunedPortfolio } = await db.portfolioSnapshot.deleteMany({
    where: { snapshotAt: { lt: yearAgo } },
  })

  console.log(
    `[CRON:PORTFOLIO] Snapshots: ${portfolioSnapshotCount}, Portfolio alerts triggered: ${triggeredAlertIds.length}, Digests sent: ${digestUsers.length}, Sent: ${sent}, Failed: ${failed}`,
  )

  return {
    portfolioSnapshotCount,
    portfolioAlertsTriggered: triggeredAlertIds.length,
    digestsSent: digestUsers.length,
    messageSent: sent,
    messageFailed: failed,
    prunedPortfolio,
  }
}
