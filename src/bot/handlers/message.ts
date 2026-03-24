import type { BotContext } from '../context'
import { getLocale } from '../middleware/locale'
import { buildMainMenu } from '../screens/main'

/** Catch-all message handler: any text (including /start) shows the main menu. */
export async function handleMessage(ctx: BotContext): Promise<void> {
  const locale = getLocale(ctx)
  const { text, keyboard } = buildMainMenu(locale)
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  })
}
