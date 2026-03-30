import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function alertListFooterKeyboard(locale: BotLocale): InlineKeyboard {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  const manageUrl = `https://t.me/${botUsername}/app?startapp=alerts`

  return new InlineKeyboard()
    .url(t(locale, 'bot.alerts.manageInApp'), manageUrl)
    .row()
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}
