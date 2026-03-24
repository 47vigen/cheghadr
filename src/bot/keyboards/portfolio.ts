import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function portfolioSubKeyboard(locale: BotLocale): InlineKeyboard {
  return new InlineKeyboard().text(t(locale, 'bot.nav.back'), CB.HOME)
}
