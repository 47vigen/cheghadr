import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import { db } from '@/server/db'

import type { BotContext } from '../context'
import { t } from '../i18n'
import { getLocale } from '../middleware/locale'
import { buildAlertDeleteConfirm, buildAlertList } from '../screens/alerts'
import { buildMainMenu } from '../screens/main'
import {
  buildAssetList,
  buildBreakdown,
  buildPortfolioSummary,
} from '../screens/portfolio'
import { buildCategoryMenu, buildPricePage } from '../screens/prices'
import { buildSettings } from '../screens/settings'

/** Main callback_query dispatcher. */
export async function handleCallbacks(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery()

  const data = ctx.callbackQuery?.data ?? ''
  const parts = data.split(':')
  const screen = parts[0]
  const action = parts[1]
  const user = ctx.botUser
  const locale = getLocale(ctx)

  if (!user) {
    await ctx.editMessageText(t(locale, 'bot.notRegistered'), {
      parse_mode: 'HTML',
    })
    return
  }

  // ── Home ────────────────────────────────────────────────────────────────
  if (screen === 'h') {
    const { text, keyboard } = buildMainMenu(locale)
    await ctx.editMessageText(text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    })
    return
  }

  // ── Portfolio ────────────────────────────────────────────────────────────
  if (screen === 'p') {
    if (action === 'v') {
      const { text, keyboard } = await buildPortfolioSummary(user.id, locale)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 'b') {
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
  if (screen === 'al') {
    if (action === 'l') {
      const { text, keyboard } = await buildAlertList(user.id, locale)
      await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      })
    } else if (action === 't') {
      // Toggle alert active/inactive
      const alertId = parts[2]
      if (alertId) {
        const alert = await db.alert.findUnique({ where: { id: alertId } })
        if (alert && alert.userId === user.id) {
          if (!alert.isActive) {
            const activeCount = await db.alert.count({
              where: { userId: user.id, isActive: true },
            })
            if (activeCount >= MAX_ACTIVE_ALERTS) {
              await ctx.reply(
                t(locale, 'bot.alerts.wizard.maxReached', {
                  max: MAX_ACTIVE_ALERTS,
                }),
                { parse_mode: 'HTML' },
              )
              return
            }
          }
          await db.alert.update({
            where: { id: alertId },
            data: {
              isActive: !alert.isActive,
              ...(alert.isActive ? {} : { triggeredAt: null }),
            },
          })
        }
        const { text, keyboard } = await buildAlertList(user.id, locale)
        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
      }
    } else if (action === 'dc') {
      const alertId = parts[2]
      if (alertId) {
        const { text, keyboard } = await buildAlertDeleteConfirm(
          user.id,
          alertId,
          locale,
        )
        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
      }
    } else if (action === 'dy') {
      const alertId = parts[2]
      if (alertId) {
        const alert = await db.alert.findUnique({ where: { id: alertId } })
        if (alert && alert.userId === user.id) {
          await db.alert.delete({ where: { id: alertId } })
        }
        const { text, keyboard } = await buildAlertList(user.id, locale)
        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
      }
    } else if (action === 'np') {
      await ctx.conversation.enter('priceAlert')
    } else if (action === 'nq') {
      await ctx.conversation.enter('portfolioAlert')
    }
    return
  }

  // ── Assets ───────────────────────────────────────────────────────────────
  if (screen === 'as') {
    if (action === 'a') {
      await ctx.conversation.enter('assetAdd')
    } else if (action === 'dc') {
      const assetId = parts[2]
      if (assetId) {
        const asset = await db.userAsset.findUnique({ where: { id: assetId } })
        if (asset && asset.userId === user.id) {
          const { assetDeleteConfirmKeyboard } = await import(
            '../keyboards/assets'
          )
          await ctx.editMessageText(
            t(locale, 'bot.assets.deleteConfirmTitle'),
            {
              parse_mode: 'HTML',
              reply_markup: assetDeleteConfirmKeyboard(locale, assetId),
            },
          )
        }
      }
    } else if (action === 'dy') {
      const assetId = parts[2]
      if (assetId) {
        const asset = await db.userAsset.findUnique({ where: { id: assetId } })
        if (asset && asset.userId === user.id) {
          await db.userAsset.delete({ where: { id: assetId } })
        }
        const { text, keyboard } = await buildAssetList(user.id, locale)
        await ctx.editMessageText(text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
      }
    }
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
      const newLocale = action === 'lf' ? 'fa' : 'en'
      await db.user.update({
        where: { id: user.id },
        data: { preferredLocale: newLocale },
      })
      // Update ctx.botUser so the next render uses the new locale
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
