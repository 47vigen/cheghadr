import type { Context } from 'grammy'

export interface BotUser {
  id: string
  telegramUserId: bigint
  preferredLocale: 'en' | 'fa'
  dailyDigestEnabled: boolean
}

export type BotContext = Context & { botUser?: BotUser }
