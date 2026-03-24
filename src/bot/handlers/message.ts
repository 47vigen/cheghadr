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
  const { text, keyboard } = await buildMainMenu(user.id, locale)
  await ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  })
}
