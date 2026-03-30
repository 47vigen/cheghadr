import {
  computeAssetValueIRT,
  findBySymbol,
  formatChange,
  formatIRT,
  getLocalizedItemName,
  getSellPriceBySymbol,
} from '@/lib/prices'
import { db } from '@/server/db'
import { getCachedPriceSnapshot } from '@/server/price-cache'

import { escapeTelegramHtml } from '../html-escape'
import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { assetListFooterKeyboard } from '../keyboards/assets'
import type { ScreenResult } from './types'

export async function buildAssetList(
  userId: string,
  locale: BotLocale,
): Promise<ScreenResult> {
  const [assets, portfolioCount] = await Promise.all([
    db.userAsset.findMany({
      where: { userId },
      orderBy: [{ portfolioId: 'asc' }, { createdAt: 'asc' }],
      include: { portfolio: { select: { name: true } } },
    }),
    db.portfolio.count({ where: { userId } }),
  ])

  if (assets.length === 0) {
    return {
      text: `${t(locale, 'bot.assets.listTitle')}\n\n${t(locale, 'bot.assets.noAssets')}`,
      keyboard: assetListFooterKeyboard(locale),
    }
  }

  const cached = await getCachedPriceSnapshot(db)
  const prices = cached?.prices ?? []

  const showPortfolioLabels = portfolioCount > 1

  const byPortfolio = new Map<string, typeof assets>()
  for (const asset of assets) {
    const key = showPortfolioLabels ? asset.portfolioId : '__single__'
    const group = byPortfolio.get(key) ?? []
    group.push(asset)
    byPortfolio.set(key, group)
  }

  const lines: string[] = [t(locale, 'bot.assets.listTitle')]

  for (const [portfolioId, group] of byPortfolio) {
    if (showPortfolioLabels && portfolioId !== '__single__') {
      const name = escapeTelegramHtml(group[0]?.portfolio?.name ?? portfolioId)
      lines.push(`\n📁 <b>${name}</b>`)
    } else {
      lines.push('')
    }

    for (const asset of group) {
      const item = findBySymbol(prices, asset.symbol)
      const rawName = item ? getLocalizedItemName(item, locale) : asset.symbol
      const name = escapeTelegramHtml(rawName)
      const symbol = escapeTelegramHtml(asset.symbol)
      const qty = Number(asset.quantity)
      const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
      const value = computeAssetValueIRT(qty, sellPrice)
      const changeInfo = item ? formatChange(item.change, locale) : null
      const changeStr = changeInfo ? ` (${changeInfo.text})` : ''

      lines.push(
        `• <b>${name}</b> (${symbol})\n  ${qty.toFixed(4)} × ${formatIRT(sellPrice, locale)} = <b>${formatIRT(value, locale)}</b>${changeStr}`,
      )
    }
  }

  return {
    text: lines.join('\n'),
    keyboard: assetListFooterKeyboard(locale),
  }
}
