import type { PrismaClient } from '@prisma/client'

import {
  dailyDigestMessage,
  portfolioAlertMessage,
  toAlertMessageLocale,
} from '@/lib/alerts/messages'
import { hasCrossedThreshold } from '@/lib/alerts/utils'
import { NotificationQueue } from '@/lib/notifications'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import {
  getBaseSymbol,
  getBilingualAssetLabels,
  getSellPriceBySymbol,
  parsePriceSnapshot,
  pickDisplayName,
} from '@/lib/prices'
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

  let portfolioSnapshotCount = 0
  for (const user of activeUsers) {
    const portfolios = await db.portfolio.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    for (const portfolio of portfolios) {
      const snap = await createPortfolioSnapshot(db, user.id, portfolio.id)
      if (snap) portfolioSnapshotCount++
    }

    const snap = await createPortfolioSnapshot(db, user.id, null)
    if (snap) portfolioSnapshotCount++
  }

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
  const latestPriceSnap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })

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

    let topMoverName = ''
    if (latestPriceSnap) {
      const prices = parsePriceSnapshot(latestPriceSnap.data)
      const breakdown = parseBreakdownJson(todaySnap.breakdown)
      let maxValue = 0
      for (const item of breakdown) {
        const price = getSellPriceBySymbol(item.symbol, prices)
        const value = item.quantity * price
        if (value > maxValue) {
          maxValue = value
          const priceItem = prices.find((p) => getBaseSymbol(p) === item.symbol)
          const labels = getBilingualAssetLabels(priceItem, item.symbol)
          topMoverName = pickDisplayName(labels, digestLocale)
        }
      }
    }

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
