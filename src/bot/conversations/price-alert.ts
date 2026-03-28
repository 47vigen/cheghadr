import type { Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import {
  getLocalizedItemName,
  groupByCategory,
  sortedGroupEntries,
} from '@/lib/prices'
import { db } from '@/server/db'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { t } from '../i18n'
import { buildAlertList } from '../screens/alerts'
import { getLatestPrices } from '../shared/prices'
import {
  assetPageKeyboard,
  categorySelectionKeyboard,
  showMain,
  showSuccessAndList,
} from '../shared/wizard'
import { loadBotUserAndLocale } from './utils'
import { waitForPositiveNumberOrExit } from './wait-for-number'

const PAGE_SIZE = 10

export async function priceAlertWizard(
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

  // ── Step 1: Category ────────────────────────────────────────────────────
  const prices = await conversation.external(() => getLatestPrices())
  const grouped = groupByCategory(prices)
  const categories = sortedGroupEntries(grouped).map(([cat]) => cat)

  await ctx.editMessageText(t(locale, 'bot.alerts.wizard.selectCategory'), {
    parse_mode: 'HTML',
    reply_markup: categorySelectionKeyboard(
      categories,
      locale,
      'bot.alerts.wizard.cancel',
    ),
  })

  const catCtx = await conversation.waitForCallbackQuery([
    /^wz:c:/,
    CB.WIZARD_CANCEL,
  ])
  await catCtx.answerCallbackQuery()

  if (catCtx.callbackQuery.data === CB.WIZARD_CANCEL) {
    await catCtx.editMessageText(t(locale, 'bot.alerts.wizard.cancelled'), {
      parse_mode: 'HTML',
    })
    await showMain(user.id, catCtx, locale)
    return
  }

  const selectedCategory = catCtx.callbackQuery.data.split(':')[2] ?? ''
  const categoryItems = grouped.get(selectedCategory) ?? []

  // ── Step 2: Asset (paginated) ────────────────────────────────────────────
  let page = 0
  let selectedSymbol: string | undefined

  while (!selectedSymbol) {
    const totalPages = Math.max(1, Math.ceil(categoryItems.length / PAGE_SIZE))
    const pageItems = categoryItems
      .slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
      .map((item) => ({
        symbol: item.base_currency?.symbol ?? '',
        name: getLocalizedItemName(item, locale),
      }))

    const editCtx = selectedSymbol === undefined ? catCtx : ctx
    await editCtx.editMessageText(t(locale, 'bot.alerts.wizard.selectAsset'), {
      parse_mode: 'HTML',
      reply_markup: assetPageKeyboard(
        pageItems,
        selectedCategory,
        page,
        totalPages,
        locale,
        'bot.alerts.wizard.cancel',
      ),
    })

    const assetCtx = await conversation.waitForCallbackQuery([
      /^wz:a:/,
      /^wz:n:/,
      /^wz:p:/,
      CB.WIZARD_CANCEL,
    ])
    await assetCtx.answerCallbackQuery()

    const [, subAction, val, pageStr] = assetCtx.callbackQuery.data.split(':')

    if (assetCtx.callbackQuery.data === CB.WIZARD_CANCEL) {
      await assetCtx.editMessageText(t(locale, 'bot.alerts.wizard.cancelled'), {
        parse_mode: 'HTML',
      })
      await showMain(user.id, assetCtx, locale)
      return
    }

    if (subAction === 'a') {
      selectedSymbol = val
    } else if (subAction === 'n') {
      page = Math.min(Number(pageStr ?? '0'), totalPages - 1)
    } else if (subAction === 'p') {
      page = Math.max(0, Number(pageStr ?? '0'))
    }
  }

  // ── Step 3: Direction ────────────────────────────────────────────────────
  const dirKb = new InlineKeyboard()
    .text(t(locale, 'bot.alerts.wizard.above'), CB.wizardDirectionAbove)
    .text(t(locale, 'bot.alerts.wizard.below'), CB.wizardDirectionBelow)
    .row()
    .text(t(locale, 'bot.alerts.wizard.cancel'), CB.WIZARD_CANCEL)

  await ctx.editMessageText(t(locale, 'bot.alerts.wizard.selectDirection'), {
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

  // ── Step 4: Threshold (free text) ────────────────────────────────────────
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

  // ── Step 5: Save ──────────────────────────────────────────────────────────
  await conversation.external(() =>
    db.alert.create({
      data: {
        userId: user.id,
        type: 'PRICE',
        symbol: selectedSymbol,
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
    'priceAlertWizard',
  )
}
