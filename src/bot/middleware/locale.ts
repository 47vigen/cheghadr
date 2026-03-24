import type { BotContext } from '../context'
import type { BotLocale } from '../i18n'

/** Get the locale for the current user. Defaults to 'fa'. */
export function getLocale(ctx: BotContext): BotLocale {
  return (ctx.botUser?.preferredLocale as BotLocale | undefined) ?? 'fa'
}
