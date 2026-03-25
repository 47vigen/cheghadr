import type { Bot } from 'grammy'

import type { BotContext } from './context'
import { createBot } from './index'

let cachedBot: Bot<BotContext> | undefined

/** Return a singleton Bot instance (avoids re-registering middleware on every webhook). */
export function getBot(): Bot<BotContext> {
  if (!cachedBot) {
    cachedBot = createBot()
  }
  return cachedBot
}
