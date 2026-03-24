import type { InlineKeyboard } from 'grammy'

import {
  findBySymbol,
  formatIRT,
  getLocalizedItemName,
  parsePriceSnapshot,
} from '@/lib/prices'
import { db } from '@/server/db'

import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import {
  alertDeleteConfirmKeyboard,
  alertListFooterKeyboard,
  alertRowKeyboard,
} from '../keyboards/alerts'

interface ScreenResult {
  text: string
  keyboard: InlineKeyboard
  /** When true, caller should send separate messages per alert row (complex layout). */
  multiMessage?: boolean
}

function formatThreshold(threshold: string, locale: BotLocale): string {
  const n = Number(threshold)
  if (Number.isNaN(n)) return threshold
  return formatIRT(Math.round(n), locale)
}

export async function buildAlertList(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const alerts = await db.alert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  if (alerts.length === 0) {
    return {
      text: `${t(locale, 'bot.alerts.listTitle')}\n\n${t(locale, 'bot.alerts.noAlerts')}`,
      keyboard: alertListFooterKeyboard(locale),
    }
  }

  // Get price names for PRICE alerts
  const snap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  const prices = snap ? parsePriceSnapshot(snap.data) : []

  const dirAbove = t(locale, 'bot.alerts.dirAbove')
  const dirBelow = t(locale, 'bot.alerts.dirBelow')

  const lines: string[] = [t(locale, 'bot.alerts.listTitle')]
  for (const alert of alerts) {
    const dir = alert.direction === 'ABOVE' ? dirAbove : dirBelow
    const threshold = formatThreshold(alert.thresholdIRT.toString(), locale)
    const status = alert.isActive
      ? t(locale, 'bot.alerts.statusActive')
      : t(locale, 'bot.alerts.statusPaused')

    let label: string
    if (alert.type === 'PRICE' && alert.symbol) {
      const item = findBySymbol(prices, alert.symbol)
      const name = item ? getLocalizedItemName(item, locale) : alert.symbol
      label = t(locale, 'bot.alerts.labelPrice', { name, dir, threshold })
    } else {
      label = t(locale, 'bot.alerts.labelPortfolio', { dir, threshold })
    }

    lines.push(`\n${status} ${label}`)
  }

  const text = lines.join('\n')
  return { text, keyboard: alertListFooterKeyboard(locale) }
}

export async function buildAlertDeleteConfirm(
  userId: string,
  alertId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const alert = await db.alert.findUnique({ where: { id: alertId } })

  if (!alert || alert.userId !== userId) {
    // Fallback to list
    return buildAlertList(userId, locale)
  }

  return {
    text: t(locale, 'bot.alerts.deleteConfirmTitle'),
    keyboard: alertDeleteConfirmKeyboard(locale, alertId),
  }
}

export { alertRowKeyboard }
