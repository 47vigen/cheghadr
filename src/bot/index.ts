import { Bot } from 'grammy'

import type { BotContext } from './context'
import { handleCallbacks } from './handlers/callbacks'
import { handleMessage } from './handlers/message'
import { userMiddleware } from './middleware/user'

export function createBot(): Bot<BotContext> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured')

  const bot = new Bot<BotContext>(token)

  // 1. User find-or-create
  bot.use(userMiddleware)

  // 2. Callback queries (button presses)
  bot.on('callback_query:data', handleCallbacks)

  // 3. Catch-all: any text message or /start → main menu
  bot.on('message', handleMessage)

  return bot
}
