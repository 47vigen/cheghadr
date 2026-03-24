import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function portfolioKeyboard(locale: BotLocale): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, 'bot.nav.breakdown'), CB.PORTFOLIO_BREAKDOWN)
    .text(t(locale, 'bot.nav.assets'), CB.PORTFOLIO_ASSETS)
    .row()
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}

export function portfolioSubKeyboard(locale: BotLocale): InlineKeyboard {
  return new InlineKeyboard().text(t(locale, 'bot.nav.back'), CB.PORTFOLIO_VIEW)
}
