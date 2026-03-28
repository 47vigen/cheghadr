import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function alertListFooterKeyboard(locale: BotLocale): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, 'bot.alerts.newPrice'), CB.ALERT_NEW_PRICE)
    .text(t(locale, 'bot.alerts.newPortfolio'), CB.ALERT_NEW_PORTFOLIO)
    .row()
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}

export function alertDeleteConfirmKeyboard(
  locale: BotLocale,
  alertId: string,
): InlineKeyboard {
  return new InlineKeyboard()
    .text(t(locale, 'bot.alerts.deleteYes'), CB.alertDeleteYes(alertId))
    .text(t(locale, 'bot.alerts.deleteNo'), CB.ALERTS_LIST)
}

