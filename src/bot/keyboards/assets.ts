import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function assetListFooterKeyboard(locale: BotLocale): InlineKeyboard {
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? ''
  const addAssetUrl = `https://t.me/${botUsername}/app?startapp=assets_add`

  return new InlineKeyboard()
    .url(t(locale, 'bot.assets.addInApp'), addAssetUrl)
    .row()
    .text(t(locale, 'bot.nav.breakdown'), CB.PORTFOLIO_BREAKDOWN)
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}
