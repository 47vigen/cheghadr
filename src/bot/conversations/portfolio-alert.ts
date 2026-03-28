import type { Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import { db } from '@/server/db'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { t } from '../i18n'
import { buildAlertList } from '../screens/alerts'
import { showMain, showSuccessAndList } from '../shared/wizard'
import { loadBotUserAndLocale } from './utils'
import { waitForPositiveNumberOrExit } from './wait-for-number'

export async function portfolioAlertWizard(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  const loaded = await loadBotUserAndLocale(conversation)
  if (!loaded) return
  const { user, locale } = loaded

  // Check max alerts
  const activeCount = await conversation.external(() =>
    db.alert.count({ where: { userId: user.id, isActive: true } }),
  )

  if (activeCount >= MAX_ACTIVE_ALERTS) {
    const homeKb = new InlineKeyboard().text(
      t(locale, 'bot.wizard.home'),
      CB.HOME,
    )
    await ctx.editMessageText(
      t(locale, 'bot.alerts.wizard.maxReached', { max: MAX_ACTIVE_ALERTS }),
      { parse_mode: 'HTML', reply_markup: homeKb },
    )
    return
  }

  // ── Step 1: Direction ────────────────────────────────────────────────────
  const dirKb = new InlineKeyboard()
    .text(t(locale, 'bot.alerts.wizard.above'), CB.wizardDirectionAbove)
    .text(t(locale, 'bot.alerts.wizard.below'), CB.wizardDirectionBelow)
    .row()
    .text(t(locale, 'bot.alerts.wizard.cancel'), CB.WIZARD_CANCEL)

  await ctx.editMessageText(t(locale, 'bot.alerts.wizard.portfolioTitle'), {
    parse_mode: 'HTML',
    reply_markup: dirKb,
  })

  const dirCtx = await conversation.waitForCallbackQuery([
    CB.wizardDirectionAbove,
    CB.wizardDirectionBelow,
    CB.WIZARD_CANCEL,
  ])
  await dirCtx.answerCallbackQuery()

  if (dirCtx.callbackQuery.data === CB.WIZARD_CANCEL) {
    await dirCtx.editMessageText(t(locale, 'bot.alerts.wizard.cancelled'), {
      parse_mode: 'HTML',
    })
    await showMain(user.id, dirCtx, locale)
    return
  }

  const direction = dirCtx.callbackQuery.data.split(':')[2] as 'ABOVE' | 'BELOW'

  // ── Step 2: Threshold ────────────────────────────────────────────────────
  await dirCtx.editMessageText(t(locale, 'bot.alerts.wizard.enterThreshold'), {
    parse_mode: 'HTML',
  })

  const anchorChatId = ctx.chat?.id
  const anchorMessageId = ctx.callbackQuery?.message?.message_id
  if (anchorChatId === undefined || anchorMessageId === undefined) return

  const thresholdIRT = await waitForPositiveNumberOrExit({
    conversation,
    replyCtx: ctx,
    userId: user.id,
    locale,
    anchorChatId,
    anchorMessageId,
    cancelledHtml: t(locale, 'bot.alerts.wizard.cancelled'),
    invalidHtml: t(locale, 'bot.alerts.wizard.invalidNumber'),
    cancelButtonLabel: t(locale, 'bot.alerts.wizard.cancel'),
    helperHintHtml: t(locale, 'bot.wizard.numberInputHint'),
  })
  if (thresholdIRT === null) return

  // ── Step 3: Save ──────────────────────────────────────────────────────────
  await conversation.external(() =>
    db.alert.create({
      data: {
        userId: user.id,
        type: 'PORTFOLIO',
        symbol: null,
        direction,
        thresholdIRT,
      },
    }),
  )

  await showSuccessAndList(
    ctx,
    user.id,
    locale,
    t(locale, 'bot.alerts.wizard.created'),
    buildAlertList,
    'portfolioAlertWizard',
  )
}
