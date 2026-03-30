import { findBySymbol, formatIRT, getLocalizedItemName } from '@/lib/prices'
import { db } from '@/server/db'

import { escapeTelegramHtml } from '../html-escape'
import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { alertListFooterKeyboard } from '../keyboards/alerts'
import { getLatestPrices } from '../shared/prices'
import type { ScreenResult } from './types'

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

  const prices = await getLatestPrices()

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
      const rawName = item ? getLocalizedItemName(item, locale) : alert.symbol
      const name = escapeTelegramHtml(rawName)
      label = t(locale, 'bot.alerts.labelPrice', { name, dir, threshold })
    } else {
      label = t(locale, 'bot.alerts.labelPortfolio', { dir, threshold })
    }

    lines.push(`\n${status} ${label}`)
  }

  return {
    text: lines.join('\n'),
    keyboard: alertListFooterKeyboard(locale),
  }
}
