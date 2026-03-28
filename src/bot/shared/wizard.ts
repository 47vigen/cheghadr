import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { type BotLocale, t, tCategory } from '../i18n'

/** Build a two-column category picker for wizard flows. */
export function categorySelectionKeyboard(
  categories: string[],
  locale: BotLocale,
  cancelKey: string,
): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (let i = 0; i < categories.length; i += 2) {
    const a = categories[i]
    const b = categories[i + 1]
    if (a) kb.text(tCategory(locale, a), CB.wizardCategory(a))
    if (b) kb.text(tCategory(locale, b), CB.wizardCategory(b))
    kb.row()
  }
  kb.text(t(locale, cancelKey), CB.WIZARD_CANCEL)
  return kb
}

/** Build a paginated asset list for wizard flows. */
export function assetPageKeyboard(
  items: Array<{ symbol: string; name: string }>,
  category: string,
  page: number,
  totalPages: number,
  locale: BotLocale,
  cancelKey: string,
): InlineKeyboard {
  const kb = new InlineKeyboard()
  for (const item of items) {
    kb.text(item.name, CB.wizardAsset(item.symbol)).row()
  }
  if (page > 0) {
    kb.text(
      t(locale, 'bot.wizard.pagePrev'),
      CB.wizardPagePrev(category, page - 1),
    )
  }
  if (page < totalPages - 1) {
    kb.text(
      t(locale, 'bot.wizard.pageNext'),
      CB.wizardPageNext(category, page + 1),
    )
  }
  if (page > 0 || page < totalPages - 1) kb.row()
  kb.text(t(locale, cancelKey), CB.WIZARD_CANCEL)
  return kb
}

/** Navigate back to the main menu (used after cancel in wizards). */
export async function showMain(
  userId: string,
  ctx: Pick<Context, 'reply'>,
  locale: BotLocale,
): Promise<void> {
  const { buildMainMenu } = await import('../screens/main')
  const { text, keyboard } = await buildMainMenu(userId, locale)
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
}

/**
 * After a wizard completes successfully: edit the anchor to show the success
 * text, then immediately reply with the relevant list screen.
 * No setTimeout — safe for Vercel serverless.
 */
export async function showSuccessAndList(
  ctx: BotContext,
  userId: string,
  locale: BotLocale,
  successHtml: string,
  buildList: (
    userId: string,
    locale: BotLocale,
  ) => Promise<{ text: string; keyboard: InlineKeyboard }>,
  logTag: string,
): Promise<void> {
  try {
    await ctx.reply(successHtml, { parse_mode: 'HTML' })
    const { text, keyboard } = await buildList(userId, locale)
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
  } catch (e) {
    console.error(`[bot/${logTag}] showSuccessAndList failed`, e)
  }
}
