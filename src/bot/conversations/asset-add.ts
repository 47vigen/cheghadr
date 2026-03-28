import type { Conversation } from '@grammyjs/conversations'
import { InlineKeyboard } from 'grammy'

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
import { escapeTelegramHtml } from '../html-escape'
import { t } from '../i18n'
import { buildAssetList } from '../screens/assets'
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

export async function assetAddWizard(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  const loaded = await loadBotUserAndLocale(conversation)
  if (!loaded) return
  const { user, locale } = loaded

  // ── Step 0: Portfolio selection (skip if only one portfolio) ─────────────
  const portfolios = await conversation.external(() =>
    db.portfolio.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, emoji: true },
    }),
  )

  let selectedPortfolioId: string

  if (portfolios.length === 0) {
    // Auto-create default
    const defaultPortfolio = await conversation.external(() =>
      ensureDefaultPortfolio(db, user.id),
    )
    selectedPortfolioId = defaultPortfolio.id
  } else if (portfolios.length === 1 && portfolios[0]) {
    // Skip picker
    selectedPortfolioId = portfolios[0].id
  } else {
    // Show portfolio picker
    const pfKb = new InlineKeyboard()
    for (const pf of portfolios) {
      const label = pf.emoji ? `${pf.emoji} ${pf.name}` : pf.name
      pfKb.text(label, CB.wizardPortfolio(pf.id)).row()
    }
    pfKb.text(t(locale, 'bot.assets.wizard.cancel'), CB.WIZARD_CANCEL)

    await ctx.editMessageText(t(locale, 'bot.assets.wizard.selectPortfolio'), {
      parse_mode: 'HTML',
      reply_markup: pfKb,
    })

    const pfCtx = await conversation.waitForCallbackQuery([
      /^wz:pf:/,
      CB.WIZARD_CANCEL,
    ])
    await pfCtx.answerCallbackQuery()

    if (pfCtx.callbackQuery.data === CB.WIZARD_CANCEL) {
      await pfCtx.editMessageText(t(locale, 'bot.assets.wizard.cancelled'), {
        parse_mode: 'HTML',
      })
      await showMain(user.id, pfCtx, locale)
      return
    }

    selectedPortfolioId = pfCtx.callbackQuery.data.split(':')[2] ?? ''
    if (!selectedPortfolioId) return
  }

  // ── Step 1: Category ────────────────────────────────────────────────────
  const prices = await conversation.external(() => getLatestPrices())
  const grouped = groupByCategory(prices)
  const categories = sortedGroupEntries(grouped).map(([cat]) => cat)

  if (categories.length === 0) {
    await ctx.editMessageText(t(locale, 'bot.assets.wizard.noPriceData'), {
      parse_mode: 'HTML',
    })
    await showMain(user.id, ctx, locale)
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
  const isUpdate = await conversation.external(() =>
    db.userAsset
      .findUnique({
        where: {
          userId_symbol_portfolioId: {
            userId: user.id,
            symbol,
            portfolioId: selectedPortfolioId,
          },
        },
        select: { id: true },
      })
      .then((r: { id: string } | null) => r !== null),
  )

  await conversation.external(async () => {
    await db.userAsset.upsert({
      where: {
        userId_symbol_portfolioId: {
          userId: user.id,
          symbol,
          portfolioId: selectedPortfolioId,
        },
      },
      update: { quantity },
      create: {
        userId: user.id,
        symbol,
        portfolioId: selectedPortfolioId,
        quantity,
      },
    })
    refreshPortfolioSnapshotsAfterAssetChange(db, user.id, selectedPortfolioId)
  })

  // Find localized asset name for success message
  const priceItem = prices.find(
    (p) => p.base_currency?.symbol?.toUpperCase() === symbol.toUpperCase(),
  )
  const assetName = priceItem
    ? escapeTelegramHtml(getLocalizedItemName(priceItem, locale))
    : escapeTelegramHtml(symbol)

  const successKey = isUpdate
    ? 'bot.assets.wizard.updated'
    : 'bot.assets.wizard.created'
  const successHtml = t(locale, successKey, { name: assetName, qty: quantity })

  await showSuccessAndList(
    ctx,
    user.id,
    locale,
    successHtml,
    buildAssetList,
    'assetAddWizard',
  )
}
