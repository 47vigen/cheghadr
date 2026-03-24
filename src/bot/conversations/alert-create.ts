import type { Conversation } from '@grammyjs/conversations'
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
import { t, tCategory } from '../i18n'
import { getLocale } from '../middleware/locale'
import { buildAlertList } from '../screens/alerts'

const PAGE_SIZE = 10

async function getLatestPrices() {
  const snap = await db.priceSnapshot.findFirst({
    orderBy: { snapshotAt: 'desc' },
  })
  return snap ? parsePriceSnapshot(snap.data) : []
}

function categorySelectionKeyboard(
  categories: string[],
  locale: ReturnType<typeof getLocale>,
) {
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
  locale: ReturnType<typeof getLocale>,
) {
  const kb = new InlineKeyboard()
  for (const item of items) {
    kb.text(item.name, CB.wizardAsset(item.symbol)).row()
  }
  if (page > 0) kb.text('◀️', CB.wizardPagePrev(category, page - 1))
  if (page < totalPages - 1) kb.text('▶️', CB.wizardPageNext(category, page + 1))
  if (page > 0 || page < totalPages - 1) kb.row()
  kb.text(t(locale, 'bot.alerts.wizard.cancel'), CB.WIZARD_CANCEL)
  return kb
}

// ── Price Alert Wizard ────────────────────────────────────────────────────

export async function priceAlertWizard(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  const locale = getLocale(ctx)
  const user = ctx.botUser

  if (!user) return

  // Check max alerts
  const activeCount = await conversation.external(() =>
    db.alert.count({ where: { userId: user.id, isActive: true } }),
  )

  if (activeCount >= MAX_ACTIVE_ALERTS) {
    await ctx.editMessageText(
      t(locale, 'bot.alerts.wizard.maxReached', { max: MAX_ACTIVE_ALERTS }),
      { parse_mode: 'HTML' },
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
    setTimeout(() => showMain(catCtx, locale), 1500)
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
      setTimeout(() => showMain(assetCtx, locale), 1500)
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
    setTimeout(() => showMain(dirCtx, locale), 1500)
    return
  }

  const direction = dirCtx.callbackQuery.data.split(':')[2] as 'ABOVE' | 'BELOW'

  // ── Step 4: Threshold (free text) ────────────────────────────────────────
  await dirCtx.editMessageText(t(locale, 'bot.alerts.wizard.enterThreshold'), {
    parse_mode: 'HTML',
  })

  let thresholdIRT: string | undefined

  while (!thresholdIRT) {
    const msgCtx = await conversation.waitFor('message:text')
    const raw = msgCtx.message.text.trim().replace(/,/g, '').replace(/٬/g, '')
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) {
      thresholdIRT = String(n)
      // Delete the user's message to keep chat clean
      await msgCtx.deleteMessage().catch(() => null)
    } else {
      await msgCtx.reply(t(locale, 'bot.alerts.wizard.invalidNumber'), {
        parse_mode: 'HTML',
      })
    }
  }

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

  // Show alert list after 1 second
  setTimeout(async () => {
    const { text, keyboard } = await buildAlertList(user.id, locale)
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
    await successMsg.delete().catch(() => null)
  }, 1000)
}

// ── Portfolio Alert Wizard ────────────────────────────────────────────────

export async function portfolioAlertWizard(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  const locale = getLocale(ctx)
  const user = ctx.botUser

  if (!user) return

  // Check max alerts
  const activeCount = await conversation.external(() =>
    db.alert.count({ where: { userId: user.id, isActive: true } }),
  )

  if (activeCount >= MAX_ACTIVE_ALERTS) {
    await ctx.editMessageText(
      t(locale, 'bot.alerts.wizard.maxReached', { max: MAX_ACTIVE_ALERTS }),
      { parse_mode: 'HTML' },
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
    setTimeout(() => showMain(dirCtx, locale), 1500)
    return
  }

  const direction = dirCtx.callbackQuery.data.split(':')[2] as 'ABOVE' | 'BELOW'

  // ── Step 2: Threshold ────────────────────────────────────────────────────
  await dirCtx.editMessageText(t(locale, 'bot.alerts.wizard.enterThreshold'), {
    parse_mode: 'HTML',
  })

  let thresholdIRT: string | undefined

  while (!thresholdIRT) {
    const msgCtx = await conversation.waitFor('message:text')
    const raw = msgCtx.message.text.trim().replace(/,/g, '').replace(/٬/g, '')
    const n = Number(raw)
    if (!Number.isNaN(n) && n > 0) {
      thresholdIRT = String(n)
      await msgCtx.deleteMessage().catch(() => null)
    } else {
      await msgCtx.reply(t(locale, 'bot.alerts.wizard.invalidNumber'), {
        parse_mode: 'HTML',
      })
    }
  }

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

  setTimeout(async () => {
    const { text, keyboard } = await buildAlertList(user.id, locale)
    await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
    await successMsg.delete().catch(() => null)
  }, 1000)
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function showMain(ctx: BotContext, locale: ReturnType<typeof getLocale>) {
  const { buildMainMenu } = await import('../screens/main')
  const { text, keyboard } = buildMainMenu(locale)
  await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard })
}
