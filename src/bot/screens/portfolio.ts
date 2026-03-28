import { InlineKeyboard } from 'grammy'

import { computeLivePortfolioBreakdown } from '@/lib/portfolio-breakdown'
import {
  getPortfolioSnapshotDelta,
  type PortfolioDeltaWindow,
} from '@/lib/portfolio-snapshot-delta'
import {
  computeAssetValueIRT,
  findBySymbol,
  formatCompactCurrency,
  formatIRT,
  getIntlLocale,
  getLocalizedItemName,
  getSellPriceBySymbol,
  getSnapshotStaleness,
} from '@/lib/prices'
import { db } from '@/server/db'
import { getCachedPriceSnapshot } from '@/server/price-cache'

import { CB } from '../callback-data'
import { escapeTelegramHtml } from '../html-escape'
import type { BotLocale } from '../i18n'
import { t, tCategory } from '../i18n'
import type { ScreenResult } from './types'

const DELTA_WINDOWS: PortfolioDeltaWindow[] = ['1D', '1W', '1M', 'ALL']

function windowLabel(locale: BotLocale, window: PortfolioDeltaWindow): string {
  switch (window) {
    case '1D':
      return t(locale, 'bot.portfolio.window1D')
    case '1W':
      return t(locale, 'bot.portfolio.window1W')
    case '1M':
      return t(locale, 'bot.portfolio.window1M')
    case 'ALL':
      return t(locale, 'bot.portfolio.windowALL')
    default:
      return window
  }
}

function formatHomeDeltaLine(
  locale: BotLocale,
  window: PortfolioDeltaWindow,
  deltaIRT: number,
  deltaPct: number,
): string {
  const label = windowLabel(locale, window)
  const signIrt = deltaIRT > 0 ? '+' : deltaIRT < 0 ? '-' : ''
  const signPct = deltaPct > 0 ? '+' : deltaPct < 0 ? '-' : ''
  const irt = formatIRT(Math.abs(Math.round(deltaIRT)), locale)
  const pct = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(deltaPct))
  const pctSuffix = locale === 'fa' ? '٪' : '%'
  return t(locale, 'bot.portfolio.homeDeltaRow', {
    label,
    signIrt,
    irt,
    signPct,
    pct,
    pctSuffix,
  })
}

/**
 * Consolidated portfolio hero text (live total, FX, staleness, snapshot deltas).
 * Main menu title is prepended by {@link buildMainMenu}.
 */
export async function buildPortfolioHomeCard(
  userId: string,
  locale: BotLocale,
): Promise<string> {
  const [userAssets, cached] = await Promise.all([
    db.userAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    getCachedPriceSnapshot(db),
  ])

  if (userAssets.length === 0) {
    return t(locale, 'bot.portfolio.noData')
  }

  const prices = cached?.prices ?? []
  const { stale, minutesOld } = getSnapshotStaleness(cached?.snapshotAt)

  let totalIRT = 0
  for (const asset of userAssets) {
    const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
    totalIRT += computeAssetValueIRT(Number(asset.quantity), sellPrice)
  }

  const usdSellPrice = getSellPriceBySymbol('USD', prices)
  const eurSellPrice = getSellPriceBySymbol('EUR', prices)
  const showUsd = usdSellPrice > 0
  const showEur = eurSellPrice > 0

  const lines: string[] = []

  lines.push(
    t(locale, 'bot.portfolio.homeTotal', {
      value: formatIRT(Math.round(totalIRT), locale),
    }),
  )

  if (showUsd || showEur) {
    const fxParts: string[] = []
    if (showUsd) {
      fxParts.push(formatCompactCurrency(totalIRT / usdSellPrice, 'USD'))
    }
    if (showEur) {
      fxParts.push(formatCompactCurrency(totalIRT / eurSellPrice, 'EUR'))
    }
    lines.push(fxParts.join(' · '))
  }

  if (stale) {
    if (Number.isFinite(minutesOld)) {
      const mins = Math.max(1, Math.round(minutesOld))
      lines.push(
        t(locale, 'bot.portfolio.homeStale', {
          minutes: String(mins),
        }),
      )
    } else {
      lines.push(t(locale, 'bot.portfolio.homeStaleUnknown'))
    }
  }

  const deltaResults = await Promise.all(
    DELTA_WINDOWS.map((w) => getPortfolioSnapshotDelta(db, userId, w)),
  )

  const deltaLines: string[] = []
  for (let i = 0; i < DELTA_WINDOWS.length; i++) {
    const d = deltaResults[i]
    const w = DELTA_WINDOWS[i]
    if (!d) continue
    deltaLines.push(formatHomeDeltaLine(locale, w, d.deltaIRT, d.deltaPct))
  }

  if (deltaLines.length > 0) {
    lines.push('')
    lines.push(t(locale, 'bot.portfolio.homeChangeHeading'))
    lines.push(...deltaLines)
  }

  return lines.join('\n')
}

export async function buildBreakdown(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const keyboard = new InlineKeyboard()
    .text(t(locale, 'bot.nav.assets'), CB.PORTFOLIO_ASSETS)
    .text(t(locale, 'bot.nav.back'), CB.HOME)

  const [userAssets, cached] = await Promise.all([
    db.userAsset.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    }),
    getCachedPriceSnapshot(db),
  ])

  const prices = cached?.prices ?? []
  const live = computeLivePortfolioBreakdown(userAssets, prices)

  if (!live) {
    return {
      text: `${t(locale, 'bot.portfolio.breakdownTitle')}\n\n${t(locale, 'bot.portfolio.noData')}`,
      keyboard,
    }
  }

  const { totalIRT: total, categories } = live

  const blocks: string[] = [
    t(locale, 'bot.portfolio.breakdownTitle'),
    '',
    t(locale, 'bot.portfolio.breakdownTotal', {
      value: formatIRT(Math.round(total), locale),
    }),
  ]

  for (const { category: cat, assets: items } of categories) {
    const catLabel = escapeTelegramHtml(tCategory(locale, cat))
    const lines: string[] = [`<b>${catLabel}</b>`]
    for (const item of items) {
      const pct = ((item.valueIRT / total) * 100).toFixed(1)
      const val = formatIRT(item.valueIRT, locale)
      const priceItem = findBySymbol(prices, item.symbol)
      const rawName = priceItem
        ? getLocalizedItemName(priceItem, locale)
        : item.symbol
      const name = escapeTelegramHtml(rawName)
      const sym = escapeTelegramHtml(item.symbol)
      const title =
        priceItem && rawName.trim() !== item.symbol.trim()
          ? `<b>${name}</b> <i>(${sym})</i>`
          : `<b>${sym}</b>`
      lines.push(`  ▸ ${title}`)
      lines.push(`     ${pct}% · ${val}`)
    }
    blocks.push('')
    blocks.push(lines.join('\n'))
  }

  const text = blocks.join('\n').replace(/^\n+/, '')

  return { text, keyboard }
}
