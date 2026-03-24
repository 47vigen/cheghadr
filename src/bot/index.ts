import { conversations, createConversation } from '@grammyjs/conversations'
import { Bot, session } from 'grammy'

import type { BotContext } from './context'
import { handleCallbacks } from './handlers/callbacks'
import { handleMessage } from './handlers/message'
import { userMiddleware } from './middleware/user'
import { prismaSessionAdapter } from './session/adapter'
import type { SessionData } from './session/types'

// Lazy-loaded conversation factories to avoid circular imports at module load time
async function _getConversations() {
  const [{ priceAlertWizard }, { portfolioAlertWizard }, { assetAddWizard }] =
    await Promise.all([
      import('./conversations/alert-create'),
      import('./conversations/alert-create'),
      import('./conversations/asset-add'),
    ])
  return { priceAlertWizard, portfolioAlertWizard, assetAddWizard }
}

export function createBot(): Bot<BotContext> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured')

  const bot = new Bot<BotContext>(token)

  // 1. Session (lazy — reads DB only when ctx.session is accessed)
  bot.use(
    session({
      initial: (): SessionData => ({}),
      storage: prismaSessionAdapter,
      getSessionKey: (ctx) => ctx.chat?.id?.toString(),
    }),
  )

  // 2. Conversations plugin (must come after session)
  bot.use(conversations())

  // Conversations are registered in registerConversations() called before first use
  // We'll register them directly here using dynamic imports to avoid circular deps
  bot.use(
    createConversation(async (conversation, ctx) => {
      const { priceAlertWizard } = await import('./conversations/alert-create')
      return priceAlertWizard(conversation, ctx)
    }, 'priceAlert'),
  )

  bot.use(
    createConversation(async (conversation, ctx) => {
      const { portfolioAlertWizard } = await import(
        './conversations/alert-create'
      )
      return portfolioAlertWizard(conversation, ctx)
    }, 'portfolioAlert'),
  )

  bot.use(
    createConversation(async (conversation, ctx) => {
      const { assetAddWizard } = await import('./conversations/asset-add')
      return assetAddWizard(conversation, ctx)
    }, 'assetAdd'),
  )

  // 3. User find-or-create
  bot.use(userMiddleware)

  // 4. Callback queries (button presses)
  bot.on('callback_query:data', handleCallbacks)

  // 5. Catch-all: any text message or /start → main menu
  bot.on('message', handleMessage)

  return bot
}
