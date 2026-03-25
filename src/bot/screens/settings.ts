import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { settingsKeyboard } from '../keyboards/settings'
import type { ScreenResult } from './types'

export function buildSettings(
  locale: BotLocale,
  dailyDigestEnabled: boolean,
): ScreenResult {
  const digestStatus = dailyDigestEnabled
    ? t(locale, 'bot.settings.digestEnabled')
    : t(locale, 'bot.settings.digestDisabled')

  const text =
    t(locale, 'bot.settings.title') +
    '\n\n' +
    t(locale, 'bot.settings.language') +
    '\n' +
    t(locale, 'bot.settings.digest') +
    ' ' +
    digestStatus

  return {
    text,
    keyboard: settingsKeyboard(locale, dailyDigestEnabled),
  }
}
