import { db } from '@/server/db'

import type { BotContext } from '../context'
import { type BotLocale, t } from '../i18n'
import { getLocale } from '../middleware/locale'
import { buildAlertList } from '../screens/alerts'
import { buildAssetList } from '../screens/assets'
import { buildMainMenu } from '../screens/main'
import { buildBreakdown } from '../screens/portfolio'
import { buildCategoryMenu, buildPricePage } from '../screens/prices'
import { buildSettings } from '../screens/settings'

/** Main callback_query dispatcher. */
export async function handleCallbacks(ctx: BotContext): Promise<void> {
  const data = ctx.callbackQuery?.data ?? ''
  const parts = data.split(':')
  const screen = parts[0]
  const action = parts[1]
  const user = ctx.botUser
  const locale = getLocale(ctx)

  if (!user) {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText(t(locale, 'bot.notRegistered'), {
      parse_mode: 'HTML',
    })
    return
  }

  await ctx.answerCallbackQuery()

  // ── Home ────────────────────────────────────────────────────────────────
  if (screen === 'h') {
    const { text, keyboard } = await buildMainMenu(user.id, locale)
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    })
    return
  }

  // ── Portfolio ────────────────────────────────────────────────────────────
  if (screen === 'p') {
    if (action === 'b') {
      const { text, keyboard } = await buildBreakdown(user.id, locale)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 'a') {
      const { text, keyboard } = await buildAssetList(user.id, locale)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    }
    return
  }

  // ── Prices ───────────────────────────────────────────────────────────────
  if (screen === 'pr') {
    if (action === 'c') {
      const { text, keyboard } = await buildCategoryMenu(locale)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 'p') {
      // pr:p:{CAT}:{PAGE}
      const category = parts[2] ?? ''
      const page = Number(parts[3] ?? '0')
      const { text, keyboard } = await buildPricePage(locale, category, page)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    }
    return
  }

  // ── Alerts ───────────────────────────────────────────────────────────────
  if (screen === 'al' && action === 'l') {
    const { text, keyboard } = await buildAlertList(user.id, locale)
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    })
    return
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  if (screen === 's') {
    if (action === 'v') {
      const { text, keyboard } = buildSettings(locale, user.dailyDigestEnabled)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 'lf' || action === 'le') {
      const newLocale: BotLocale = action === 'lf' ? 'fa' : 'en'
      await db.user.update({
        where: { id: user.id },
        data: { preferredLocale: newLocale },
      })
      ctx.botUser = { ...user, preferredLocale: newLocale }
      const { text, keyboard } = buildSettings(
        newLocale,
        user.dailyDigestEnabled,
      )
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 'd') {
      const newDigest = !user.dailyDigestEnabled
      await db.user.update({
        where: { id: user.id },
        data: { dailyDigestEnabled: newDigest },
      })
      ctx.botUser = { ...user, dailyDigestEnabled: newDigest }
      const { text, keyboard } = buildSettings(locale, newDigest)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    }
    return
  }
}
