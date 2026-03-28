import type { BotContext } from '../context'
import { t } from '../i18n'
import { getLocale } from '../middleware/locale'
import { buildMainMenu } from '../screens/main'

/** Catch-all message handler: any text (including /start) shows the main menu. */
export async function handleMessage(ctx: BotContext): Promise<void> {
  const locale = getLocale(ctx)
  const user = ctx.botUser
  if (!user) {
    await ctx.reply(t(locale, 'bot.notRegistered'), { parse_mode: 'HTML' })
    return
  }
  const cmd = ctx.message?.text?.trim().split(/\s+/)[0]?.toLowerCase()
  const showWelcome = cmd === '/start'
  // Exit any lingering conversation (e.g. stuck at waitForCallbackQuery) when
  // the user explicitly navigates away with /start or /cancel.
  if (cmd === '/start' || cmd === '/cancel') {
    await ctx.conversation.exitAll()
  }
  const { text, keyboard } = await buildMainMenu(user.id, locale, {
    showWelcome,
  })
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  })
}
