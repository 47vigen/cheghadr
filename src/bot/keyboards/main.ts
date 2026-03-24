import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function mainMenuKeyboard(locale: BotLocale): InlineKeyboard {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  const miniAppUrl = `https://t.me/${botUsername}/app`

  return new InlineKeyboard()
    .text(t(locale, 'bot.nav.portfolio'), CB.PORTFOLIO_VIEW)
    .text(t(locale, 'bot.nav.prices'), CB.PRICES_CATEGORIES)
    .row()
    .text(t(locale, 'bot.nav.alerts'), CB.ALERTS_LIST)
    .text(t(locale, 'bot.nav.settings'), CB.SETTINGS_VIEW)
    .row()
    .url(t(locale, 'bot.nav.openApp'), miniAppUrl)
}
