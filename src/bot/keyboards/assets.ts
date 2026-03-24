import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function assetListFooterKeyboard(locale: BotLocale): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, 'bot.assets.addAsset'), CB.ASSET_ADD)
    .row()
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}

export function assetDeleteConfirmKeyboard(
  locale: BotLocale,
  assetId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, 'bot.assets.deleteYes'), CB.assetDeleteYes(assetId))
    .text(t(locale, 'bot.assets.deleteNo'), CB.PORTFOLIO_ASSETS)
}
