import type { ConversationData, VersionedState } from '@grammyjs/conversations'

export interface SessionData {
  /** Persisted replay state for @grammyjs/conversations (see conversation-storage). */
  grammyConversations?: VersionedState<ConversationData>
}
