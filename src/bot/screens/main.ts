import type { InlineKeyboard } from 'grammy'

import type { BotLocale } from '../i18n'
import { t } from '../i18n'
import { mainMenuKeyboard } from '../keyboards/main'
import { buildPortfolioHomeCard } from './portfolio'

export async function buildMainMenu(
  userId: string,
  locale: BotLocale,
): Promise<{
  text: string
  keyboard: InlineKeyboard
}> {
  const card = await buildPortfolioHomeCard(userId, locale)
  return {
    text: `${t(locale, 'bot.mainMenu.title')}\n\n${card}`,
    keyboard: mainMenuKeyboard(locale),
  }
}
