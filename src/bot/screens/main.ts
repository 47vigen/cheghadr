import type { InlineKeyboard } from 'grammy'

import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { mainMenuKeyboard } from '../keyboards/main'

export function buildMainMenu(locale: BotLocale): {
  text: string
  keyboard: InlineKeyboard
} {
  return {
    text: t(locale, 'bot.mainMenu.title'),
    keyboard: mainMenuKeyboard(locale),
  }
}
