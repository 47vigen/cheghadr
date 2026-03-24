import type { ConversationData, VersionedState } from '@grammyjs/conversations'

import type { BotContext } from '../context'

type StoredConversationState = VersionedState<ConversationData>

/**
 * Context-backed storage for the conversations plugin: reads/writes the
 * versioned blob on `ctx.session` so Prisma session `finish()` persists it.
 */
export const conversationContextStorageAdapter = {
  read(ctx: BotContext): StoredConversationState | undefined {
    return ctx.session.grammyConversations
  },

  write(ctx: BotContext, state: StoredConversationState): void {
    ctx.session.grammyConversations = state
  },

  delete(ctx: BotContext): void {
    delete ctx.session.grammyConversations
  },
}
