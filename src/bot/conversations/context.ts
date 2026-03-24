import type { Conversation } from '@grammyjs/conversations'

import type { BotContext, BotUser } from '../context'
import type { BotLocale } from '../i18n'
import { getLocale } from '../middleware/locale'

/**
 * Inside conversations, `bot.use()` middleware does not run on inner context
 * objects. Read user and locale from the outside context via `external`.
 */
export async function loadBotUserAndLocale(
  conversation: Conversation<BotContext>,
): Promise<{ user: BotUser; locale: BotLocale } | null> {
  const { user, locale } = await conversation.external((outerCtx) => ({
    user: outerCtx.botUser,
    locale: getLocale(outerCtx),
  }))
  if (!user) return null
  return { user, locale }
}
