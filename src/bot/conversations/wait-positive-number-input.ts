import type { Conversation } from '@grammyjs/conversations'
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import type { BotLocale } from '../i18n'

/** Strip grouping separators for parsing. */
export function normalizeWizardNumericInput(raw: string): string {
  return raw.trim().replace(/,/g, '').replace(/٬/g, '')
}

/** Positive finite number as string, or null if invalid. */
export function parseWizardPositiveNumber(raw: string): string | null {
  const trimmed = normalizeWizardNumericInput(raw)
  if (trimmed === '') return null
  const n = Number(trimmed)
  if (!Number.isNaN(n) && n > 0 && Number.isFinite(n)) return String(n)
  return null
}

/** True if the message is /start or /cancel (with optional @bot suffix). */
export function isWizardExitCommandText(text: string): boolean {
  const token = text.trim().split(/\s+/)[0]
  if (!token) return false
  const base = token.split('@')[0]?.toLowerCase()
  return base === '/start' || base === '/cancel'
}

export type WaitPositiveNumberParams = {
  conversation: Conversation<BotContext>
  /** Used for API calls and sending the helper + main menu */
  replyCtx: BotContext
  userId: string
  locale: BotLocale
  anchorChatId: number
  anchorMessageId: number
  cancelledHtml: string
  invalidHtml: string
  cancelButtonLabel: string
  helperHintHtml: string
}

/**
 * Shows a helper message with Cancel; waits for a positive number, Cancel, or
 * /start / /cancel. Returns the number string, or null if the user exited.
 */
export async function waitForPositiveNumberOrExit(
  p: WaitPositiveNumberParams,
): Promise<string | null> {
  const cancelKb = new InlineKeyboard().text(
    p.cancelButtonLabel,
    CB.WIZARD_CANCEL,
  )

  const helperMsg = await p.replyCtx.reply(p.helperHintHtml, {
    parse_mode: 'HTML',
    reply_markup: cancelKb,
  })
  const helperChatId = helperMsg.chat.id
  const helperMessageId = helperMsg.message_id

  const deleteHelper = async () => {
    await p.replyCtx.api
      .deleteMessage(helperChatId, helperMessageId)
      .catch(() => null)
  }

  const setAnchorCancelled = async () => {
    await p.replyCtx.api
      .editMessageText(p.anchorChatId, p.anchorMessageId, p.cancelledHtml, {
        parse_mode: 'HTML',
      })
      .catch(() => null)
  }

  const sendMainMenu = async (ctx: Pick<Context, 'reply'>) => {
    const { buildMainMenu } = await import('../screens/main')
    const { text, keyboard } = await buildMainMenu(p.userId, p.locale)
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
  }

  for (;;) {
    const c = await p.conversation.wait({ collationKey: 'positiveNumOrExit' })

    if (c.callbackQuery?.data === CB.WIZARD_CANCEL) {
      await c.answerCallbackQuery().catch(() => null)
      await deleteHelper()
      await setAnchorCancelled()
      await sendMainMenu(c)
      return null
    }

    if (typeof c.message?.text !== 'string') {
      await p.conversation.skip()
    } else {
      const text = c.message.text

      if (isWizardExitCommandText(text)) {
        await c.deleteMessage().catch(() => null)
        await deleteHelper()
        await setAnchorCancelled()
        await sendMainMenu(c)
        return null
      }

      const value = parseWizardPositiveNumber(text)
      if (value) {
        await c.deleteMessage().catch(() => null)
        await deleteHelper()
        return value
      }

      await c.reply(p.invalidHtml, { parse_mode: 'HTML' })
    }
  }
}
