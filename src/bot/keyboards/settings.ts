import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import { type BotLocale, t } from '../i18n'

export function settingsKeyboard(
  locale: BotLocale,
  dailyDigestEnabled: boolean,
): InlineKeyboard {
  const faLabel =
    t(locale, 'bot.settings.localeFa') +
    (locale === 'fa' ? t(locale, 'bot.settings.checkmark') : '')
  const enLabel =
    t(locale, 'bot.settings.localeEn') +
    (locale === 'en' ? t(locale, 'bot.settings.checkmark') : '')

  const digestLabel = dailyDigestEnabled
    ? t(locale, 'bot.settings.digestEnabled')
    : t(locale, 'bot.settings.digestDisabled')

  return new InlineKeyboard()
    .text(faLabel, CB.SETTINGS_LOCALE_FA)
    .text(enLabel, CB.SETTINGS_LOCALE_EN)
    .row()
    .text(digestLabel, CB.SETTINGS_TOGGLE_DIGEST)
    .row()
    .text(t(locale, 'bot.nav.back'), CB.HOME)
}
