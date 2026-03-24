import type { InlineKeyboard } from 'grammy'

import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { mainMenuKeyboard } from '../keyboards/main'
import { buildPortfolioHomeCard } from './portfolio'

export async function buildMainMenu(
  userId: string,
  locale: BotLocale,
  options?: { showWelcome?: boolean },
): Promise<{
  text: string
  keyboard: InlineKeyboard
}> {
  const card = await buildPortfolioHomeCard(userId, locale)
  const body = `${t(locale, 'bot.mainMenu.title')}\n\n${card}`
  const text = options?.showWelcome
    ? `${t(locale, 'bot.welcome')}\n\n${body}`
    : body
  return {
    text,
    keyboard: mainMenuKeyboard(locale),
  }
}
