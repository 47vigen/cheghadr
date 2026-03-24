import type { Conversation } from '@grammyjs/conversations'
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import {
  getLocalizedItemName,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import { db } from '@/server/db'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { type BotLocale, t, tCategory } from '../i18n'
import { buildAlertList } from '../screens/alerts'
import { loadBotUserAndLocale } from './context'
import { waitForPositiveNumberOrExit } from './wait-positive-number-input'

const PAGE_SIZE = 10

async function getLatestPrices() {
  const snap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  return snap ? parsePriceSnapshot(snap.data) : []
}

function categorySelectionKeyboard(categories: string[], locale: BotLocale) {
  const kb = new InlineKeyboard()
  for (let i = 0; i < categories.length; i += 2) {
    const a = categories[i]
    const b = categories[i + 1]
    if (a) kb.text(tCategory(locale, a), CB.wizardCategory(a))
    if (b) kb.text(tCategory(locale, b), CB.wizardCategory(b))
    kb.row()
  }
  kb.text(t(locale, 'bot.alerts.wizard.cancel'), CB.WIZARD_CANCEL)
  return kb
}

function assetPageKeyboard(
  items: Array<{ symbol: string; name: string }>,
  category: string,
  page: number,
  totalPages: number,
  locale: BotLocale,
) {
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
  kb.text(t(locale, 'bot.alerts.wizard.cancel'), CB.WIZARD_CANCEL)
  return kb
}

// ── Price Alert Wizard ────────────────────────────────────────────────────

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
    reply_markup: categorySelectionKeyboard(categories, locale),
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
    setTimeout(() => showMain(user.id, catCtx, locale), 1500)
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
      setTimeout(() => showMain(user.id, assetCtx, locale), 1500)
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
    setTimeout(() => showMain(user.id, dirCtx, locale), 1500)
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

  const successMsg = await ctx.reply(t(locale, 'bot.alerts.wizard.created'), {
    parse_mode: 'HTML',
  })

  const successChatId = ctx.chat?.id
  const successMsgId = successMsg.message_id
  // Show alert list after 1 second
  setTimeout(async () => {
    try {
      const { text, keyboard } = await buildAlertList(user.id, locale)
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
      if (successChatId)
        await ctx.api
          .deleteMessage(successChatId, successMsgId)
          .catch(() => null)
    } catch (e) {
      console.error('[bot/priceAlertWizard] success follow-up failed', e)
    }
  }, 1000)
}

// ── Portfolio Alert Wizard ────────────────────────────────────────────────

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
    setTimeout(() => showMain(user.id, dirCtx, locale), 1500)
    return
  }

  const direction = dirCtx.callbackQuery.data.split(':')[2] as 'ABOVE' | 'BELOW'

  // ── Step 2: Threshold ────────────────────────────────────────────────────
  await dirCtx.editMessageText(t(locale, 'bot.alerts.wizard.enterThreshold'), {
    parse_mode: 'HTML',
  })

  const anchorChatIdPf = ctx.chat?.id
  const anchorMessageIdPf = ctx.callbackQuery?.message?.message_id
  if (anchorChatIdPf === undefined || anchorMessageIdPf === undefined) return

  const thresholdIRT = await waitForPositiveNumberOrExit({
    conversation,
    replyCtx: ctx,
    userId: user.id,
    locale,
    anchorChatId: anchorChatIdPf,
    anchorMessageId: anchorMessageIdPf,
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

  const successMsg = await ctx.reply(t(locale, 'bot.alerts.wizard.created'), {
    parse_mode: 'HTML',
  })

  const successChatId2 = ctx.chat?.id
  const successMsgId2 = successMsg.message_id
  setTimeout(async () => {
    try {
      const { text, keyboard } = await buildAlertList(user.id, locale)
      await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
      if (successChatId2)
        await ctx.api
          .deleteMessage(successChatId2, successMsgId2)
          .catch(() => null)
    } catch (e) {
      console.error('[bot/portfolioAlertWizard] success follow-up failed', e)
    }
  }, 1000)
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function showMain(
  userId: string,
  ctx: Pick<Context, 'reply'>,
  locale: BotLocale,
) {
  const { buildMainMenu } = await import('../screens/main')
  const { text, keyboard } = await buildMainMenu(userId, locale)
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
}
