import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t, tCategory } from '../i18n'

export function categoryKeyboard(
  locale: BotLocale,
  categories: string[],
): InlineKeyboard {
  const kb = new InlineKeyboard()

  // Two categories per row
  for (let i = 0; i < categories.length; i += 2) {
    const a = categories[i]
    const b = categories[i + 1]
    if (a) {
      kb.text(tCategory(locale, a), CB.pricesPage(a, 0))
    }
    if (b) {
      kb.text(tCategory(locale, b), CB.pricesPage(b, 0))
    }
    kb.row()
  }

  kb.text(t(locale, 'bot.nav.back'), CB.HOME)
  return kb
}

export function pricePageKeyboard(
  locale: BotLocale,
  category: string,
  page: number,
  totalPages: number,
): InlineKeyboard {
  const kb = new InlineKeyboard()

  if (page > 0) {
    kb.text(t(locale, 'bot.prices.prev'), CB.pricesPage(category, page - 1))
  }
  if (page < totalPages - 1) {
    kb.text(t(locale, 'bot.prices.next'), CB.pricesPage(category, page + 1))
  }
  if (page > 0 || page < totalPages - 1) {
    kb.row()
  }

  kb.text(t(locale, 'bot.prices.backToCategories'), CB.PRICES_CATEGORIES).text(
    t(locale, 'bot.nav.back'),
    CB.HOME,
  )
  return kb
}
