import type { Conversation } from '@grammyjs/conversations'

import {
  getLocalizedItemName,
  groupByCategory,
  sortedGroupEntries,
} from '@/lib/prices'
import {
  ensureDefaultPortfolio,
  refreshPortfolioSnapshotsAfterAssetChange,
} from '@/server/api/helpers'
import { db } from '@/server/db'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { t } from '../i18n'
import { buildAssetList } from '../screens/portfolio'
import { getLatestPrices } from '../shared/prices'
import {
  assetPageKeyboard,
  categorySelectionKeyboard,
  scheduleSuccessFollowUp,
  showMain,
} from '../shared/wizard'
import { loadBotUserAndLocale } from './context'
import { waitForPositiveNumberOrExit } from './wait-positive-number-input'

const PAGE_SIZE = 10

export async function assetAddWizard(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  const loaded = await loadBotUserAndLocale(conversation)
  if (!loaded) return
  const { user, locale } = loaded

  // ── Step 1: Category ────────────────────────────────────────────────────
  const prices = await conversation.external(() => getLatestPrices())
  const grouped = groupByCategory(prices)
  const categories = sortedGroupEntries(grouped).map(([cat]) => cat)

  if (categories.length === 0) {
    await ctx.editMessageText(t(locale, 'bot.assets.wizard.noPriceData'), {
      parse_mode: 'HTML',
    })
    setTimeout(() => showMain(user.id, ctx, locale), 2000)
    return
  }

  await ctx.editMessageText(t(locale, 'bot.assets.wizard.selectCategory'), {
    parse_mode: 'HTML',
    reply_markup: categorySelectionKeyboard(
      categories,
      locale,
      'bot.assets.wizard.cancel',
    ),
  })

  const catCtx = await conversation.waitForCallbackQuery([
    /^wz:c:/,
    CB.WIZARD_CANCEL,
  ])
  await catCtx.answerCallbackQuery()

  if (catCtx.callbackQuery.data === CB.WIZARD_CANCEL) {
    await catCtx.editMessageText(t(locale, 'bot.assets.wizard.cancelled'), {
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
      .filter((row) => row.symbol.length > 0)

    const editCtx = selectedSymbol === undefined ? catCtx : ctx
    await editCtx.editMessageText(t(locale, 'bot.assets.wizard.selectAsset'), {
      parse_mode: 'HTML',
      reply_markup: assetPageKeyboard(
        pageItems,
        selectedCategory,
        page,
        totalPages,
        locale,
        'bot.assets.wizard.cancel',
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
      await assetCtx.editMessageText(t(locale, 'bot.assets.wizard.cancelled'), {
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

  const symbol = selectedSymbol
  if (!symbol) return

  // ── Step 3: Quantity (free text) ─────────────────────────────────────────
  await ctx.editMessageText(t(locale, 'bot.assets.wizard.enterQuantity'), {
    parse_mode: 'HTML',
  })

  const anchorChatId = ctx.chat?.id
  const anchorMessageId = ctx.callbackQuery?.message?.message_id
  if (anchorChatId === undefined || anchorMessageId === undefined) return

  const quantity = await waitForPositiveNumberOrExit({
    conversation,
    replyCtx: ctx,
    userId: user.id,
    locale,
    anchorChatId,
    anchorMessageId,
    cancelledHtml: t(locale, 'bot.assets.wizard.cancelled'),
    invalidHtml: t(locale, 'bot.assets.wizard.invalidQuantity'),
    cancelButtonLabel: t(locale, 'bot.assets.wizard.cancel'),
    helperHintHtml: t(locale, 'bot.wizard.numberInputHint'),
  })
  if (quantity === null) return

  // ── Step 4: Save (upsert) ─────────────────────────────────────────────────
  const portfolio = await conversation.external(() =>
    ensureDefaultPortfolio(db, user.id),
  )

  await conversation.external(async () => {
    await db.userAsset.upsert({
      where: {
        userId_symbol_portfolioId: {
          userId: user.id,
          symbol,
          portfolioId: portfolio.id,
        },
      },
      update: { quantity },
      create: {
        userId: user.id,
        symbol,
        portfolioId: portfolio.id,
        quantity,
      },
    })
    refreshPortfolioSnapshotsAfterAssetChange(db, user.id, portfolio.id)
  })

  const successMsg = await ctx.reply(t(locale, 'bot.assets.wizard.created'), {
    parse_mode: 'HTML',
  })
  scheduleSuccessFollowUp(
    ctx,
    user.id,
    locale,
    buildAssetList,
    successMsg.message_id,
    'assetAddWizard',
  )
}
