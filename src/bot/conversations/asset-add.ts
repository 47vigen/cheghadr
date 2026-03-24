import type { Conversation } from '@grammyjs/conversations'
import type { Context } from 'grammy'
import { InlineKeyboard } from 'grammy'

import {
  getLocalizedItemName,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import {
  ensureDefaultPortfolio,
  refreshPortfolioSnapshotsAfterAssetChange,
} from '@/server/api/helpers'
import { db } from '@/server/db'

import { CB } from '../callback-data'
import type { BotContext } from '../context'
import { type BotLocale, t, tCategory } from '../i18n'
import { buildAssetList } from '../screens/portfolio'
import { loadBotUserAndLocale } from './context'

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
  kb.text(t(locale, 'bot.assets.wizard.cancel'), CB.WIZARD_CANCEL)
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
  kb.text(t(locale, 'bot.assets.wizard.cancel'), CB.WIZARD_CANCEL)
  return kb
}

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
    reply_markup: categorySelectionKeyboard(categories, locale),
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

  let quantity: string | undefined

  while (!quantity) {
    const msgCtx = await conversation.waitFor('message:text')
    const raw = msgCtx.message.text.trim().replace(/,/g, '').replace(/٬/g, '')
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) {
      quantity = String(n)
      await msgCtx.deleteMessage().catch(() => null)
    } else {
      await msgCtx.reply(t(locale, 'bot.assets.wizard.invalidQuantity'), {
        parse_mode: 'HTML',
      })
    }
  }

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

  const successChatId = ctx.chat?.id
  const successMsgId = successMsg.message_id
  setTimeout(async () => {
    const { text, keyboard } = await buildAssetList(user.id, locale)
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
    if (successChatId)
      await ctx.api.deleteMessage(successChatId, successMsgId).catch(() => null)
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
