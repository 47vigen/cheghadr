import type { InlineKeyboard } from 'grammy'

import {
  formatChange,
  formatIRT,
  getLocalizedItemName,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import { db } from '@/server/db'

import { escapeTelegramHtml } from '../html-escape'
import type { BotLocale } from '../i18n'
import { t, tCategory } from '../i18n'
import { categoryKeyboard, pricePageKeyboard } from '../keyboards/prices'

const PAGE_SIZE = 10

interface ScreenResult {
  text: string
  keyboard: InlineKeyboard
}

async function getLatestPrices() {
  const snap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  return snap ? parsePriceSnapshot(snap.data) : []
}

export async function buildCategoryMenu(
  locale: BotLocale,
): Promise<ScreenResult> {
  const prices = await getLatestPrices()

  if (prices.length === 0) {
    return {
      text: t(locale, 'bot.prices.selectCategory'),
      keyboard: categoryKeyboard(locale, []),
    }
  }

  const grouped = groupByCategory(prices)
  const categories = sortedGroupEntries(grouped).map(([cat]) => cat)

  return {
    text: t(locale, 'bot.prices.selectCategory'),
    keyboard: categoryKeyboard(locale, categories),
  }
}

export async function buildPricePage(
  locale: BotLocale,
  category: string,
  page: number,
): Promise<ScreenResult> {
  const prices = await getLatestPrices()

  if (prices.length === 0) {
    return {
      text: t(locale, 'bot.prices.noData'),
      keyboard: pricePageKeyboard(locale, category, 0, 1),
    }
  }

  const grouped = groupByCategory(prices)
  const items = grouped.get(category) ?? []
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(0, page), totalPages - 1)
  const pageItems = items.slice(
    safePage * PAGE_SIZE,
    (safePage + 1) * PAGE_SIZE,
  )

  const catLabel = escapeTelegramHtml(tCategory(locale, category))
  const header = t(locale, 'bot.prices.pageTitle', {
    cat: catLabel,
    n: safePage + 1,
    total: totalPages,
  })

  const lines = pageItems.map((item) => {
    const name = escapeTelegramHtml(getLocalizedItemName(item, locale))
    const price = formatIRT(Number(item.sell_price ?? 0), locale)
    const changeInfo = formatChange(item.change, locale)
    const changeStr = changeInfo
      ? ` ${changeInfo.positive ? '▲' : '▼'} ${changeInfo.text}`
      : ''
    return `• <b>${name}</b>  ${price}${changeStr}`
  })

  const text = `${header}\n\n${lines.join('\n')}`

  return {
    text,
    keyboard: pricePageKeyboard(locale, category, safePage, totalPages),
  }
}
