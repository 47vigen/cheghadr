import type { InlineKeyboard } from 'grammy'

import {
  findBySymbol,
  formatChange,
  formatIRT,
  getLocalizedItemName,
  parsePriceSnapshot,
} from '@/lib/prices'
import { db } from '@/server/db'

import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { assetListFooterKeyboard } from '../keyboards/assets'
import { portfolioKeyboard, portfolioSubKeyboard } from '../keyboards/portfolio'

interface ScreenResult {
  text: string
  keyboard: InlineKeyboard
}

export async function buildPortfolioSummary(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const keyboard = portfolioKeyboard(locale)

  // Latest consolidated snapshot (portfolioId: null)
  const snapshot = await db.portfolioSnapshot.findFirst({
    where: { userId, portfolioId: null },
    orderBy: { snapshotAt: 'desc' },
  })

  if (!snapshot) {
    return {
      text: `${t(locale, 'bot.portfolio.title')}\n\n${t(locale, 'bot.portfolio.noData')}`,
      keyboard,
    }
  }

  const totalValue = Number(snapshot.totalIRT)
  const formatted = formatIRT(totalValue, locale)

  // Calculate delta from 24h ago snapshot
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const prevSnapshot = await db.portfolioSnapshot.findFirst({
    where: { userId, portfolioId: null, snapshotAt: { lte: yesterday } },
    orderBy: { snapshotAt: 'desc' },
  })

  let deltaLine = ''
  if (prevSnapshot) {
    const prev = Number(prevSnapshot.totalIRT)
    if (prev > 0) {
      const pct = ((totalValue - prev) / prev) * 100
      const sign = pct >= 0 ? '+' : ''
      const pctStr = Math.abs(pct).toFixed(2)
      deltaLine = `\n${t(locale, 'bot.portfolio.delta', { sign, pct: pctStr })}`
    }
  }

  const totalLine = t(locale, 'bot.portfolio.total', { value: formatted })
  const text = `${t(locale, 'bot.portfolio.title')}\n\n${totalLine}${deltaLine}`

  return { text, keyboard }
}

export async function buildBreakdown(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const keyboard = portfolioSubKeyboard(locale)

  const snapshot = await db.portfolioSnapshot.findFirst({
    where: { userId, portfolioId: null },
    orderBy: { snapshotAt: 'desc' },
  })

  if (!snapshot) {
    return {
      text: `${t(locale, 'bot.portfolio.breakdownTitle')}\n\n${t(locale, 'bot.portfolio.noData')}`,
      keyboard,
    }
  }

  const total = Number(snapshot.totalIRT)
  const breakdown = snapshot.breakdown as Array<{
    symbol: string
    quantity: number
    valueIRT: number
  }>

  // Group by category — we just list top items with percentage
  const lines: string[] = []
  for (const item of breakdown) {
    if (total > 0) {
      const pct = ((item.valueIRT / total) * 100).toFixed(1)
      const val = formatIRT(item.valueIRT, locale)
      lines.push(`• <b>${item.symbol}</b>  ${pct}%  —  ${val}`)
    }
  }

  const text =
    t(locale, 'bot.portfolio.breakdownTitle') +
    '\n\n' +
    (lines.length > 0 ? lines.join('\n') : t(locale, 'bot.portfolio.noData'))

  return { text, keyboard }
}

export async function buildAssetList(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const keyboard = assetListFooterKeyboard(locale)

  const assets = await db.userAsset.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  })

  if (assets.length === 0) {
    return {
      text: `${t(locale, 'bot.assets.listTitle')}\n\n${t(locale, 'bot.assets.noAssets')}`,
      keyboard,
    }
  }

  const priceSnap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })

  const prices = priceSnap ? parsePriceSnapshot(priceSnap.data) : []

  const lines: string[] = []
  for (const asset of assets) {
    const item = findBySymbol(prices, asset.symbol)
    const name = item ? getLocalizedItemName(item, locale) : asset.symbol
    const qty = Number(asset.quantity)
    const price = item ? Number(item.sell_price ?? 0) : 0
    const value = qty * price

    const changeInfo = item ? formatChange(item.change, locale) : null
    const changeStr = changeInfo ? ` (${changeInfo.text})` : ''

    lines.push(
      `• <b>${name}</b> (${asset.symbol})\n  ${qty.toFixed(4)} × ${formatIRT(price, locale)} = <b>${formatIRT(value, locale)}</b>${changeStr}`,
    )
  }

  const text = `${t(locale, 'bot.assets.listTitle')}\n\n${lines.join('\n\n')}`

  return { text, keyboard }
}
