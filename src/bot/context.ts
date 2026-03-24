import type { ConversationFlavor } from '@grammyjs/conversations'
import type { Context, SessionFlavor } from 'grammy'

import type { SessionData } from './session/types'

export interface BotUser {
  id: string
  telegramUserId: bigint
  preferredLocale: 'en' | 'fa'
  dailyDigestEnabled: boolean
}

type BotContextBase = Context &
  SessionFlavor<SessionData> & { botUser?: BotUser }

export type BotContext = BotContextBase & ConversationFlavor<BotContextBase>
