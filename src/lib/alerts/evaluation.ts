import type { PrismaClient } from '@prisma/client'

import { priceAlertMessage, toAlertMessageLocale } from '@/lib/alerts/messages'
import { hasCrossedThreshold } from '@/lib/alerts/utils'
import { NotificationQueue } from '@/lib/notifications'
import {
  findBySymbol,
  getLocalizedItemName,
  parsePriceSnapshot,
} from '@/lib/prices'

interface PriceSnapshotRecord {
  id: string
  snapshotAt: Date
  data: unknown
}

export async function evaluatePriceAlerts(
  db: PrismaClient,
  currentSnapshot: PriceSnapshotRecord,
  previousSnapshot: PriceSnapshotRecord | null,
): Promise<{ evaluated: number; triggered: number }> {
  if (!previousSnapshot) {
    return { evaluated: 0, triggered: 0 }
  }

  const currentPrices = parsePriceSnapshot(currentSnapshot.data)
  const previousPrices = parsePriceSnapshot(previousSnapshot.data)

  const activeAlerts = await db.alert.findMany({
    where: { type: 'PRICE', isActive: true },
    include: {
      user: { select: { telegramUserId: true, preferredLocale: true } },
    },
  })

  if (activeAlerts.length === 0) {
    return { evaluated: 0, triggered: 0 }
  }

  const queue = new NotificationQueue()
  const triggeredIds: string[] = []

  for (const alert of activeAlerts) {
    if (!alert.symbol) continue

    const currentItem = findBySymbol(currentPrices, alert.symbol)
    const previousItem = findBySymbol(previousPrices, alert.symbol)

    if (!currentItem || !previousItem) continue

    const currentPrice = Number(currentItem.sell_price)
    const previousPrice = Number(previousItem.sell_price)
    const threshold = Number(alert.thresholdIRT)

    if (
      !Number.isFinite(currentPrice) ||
      !Number.isFinite(previousPrice) ||
      currentPrice <= 0 ||
      previousPrice <= 0
    ) {
      continue
    }

    const triggered = hasCrossedThreshold(
      previousPrice,
      currentPrice,
      alert.direction,
      threshold,
    )

    if (triggered) {
      const msgLocale = toAlertMessageLocale(alert.user.preferredLocale)
      const assetName = getLocalizedItemName(currentItem, msgLocale)
      const text = priceAlertMessage(
        assetName,
        alert.direction,
        alert.thresholdIRT.toString(),
        msgLocale,
      )

      queue.enqueue({
        telegramUserId: alert.user.telegramUserId,
        text,
        alertId: alert.id,
      })

      triggeredIds.push(alert.id)
    }
  }

  const { sent, failed, succeededAlertIds } = await queue.drain()

  const idsToDeactivate = triggeredIds.filter((id) =>
    succeededAlertIds.includes(id),
  )
  if (idsToDeactivate.length > 0) {
    await db.alert.updateMany({
      where: { id: { in: idsToDeactivate } },
      data: { isActive: false, triggeredAt: new Date() },
    })
  }

  console.log(
    `[ALERTS] Evaluated ${activeAlerts.length} price alerts. Triggered: ${triggeredIds.length}, Sent: ${sent}, Failed: ${failed}`,
  )

  return { evaluated: activeAlerts.length, triggered: triggeredIds.length }
}
