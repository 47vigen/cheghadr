import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  buildDailyPortfolioHistorySeries,
  exclusiveEndAfterRange,
  getPortfolioHistoryRange,
} from '@/lib/portfolio-history'
import { computeLivePortfolioBreakdown } from '@/lib/portfolio-breakdown'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import {
  getComparisonInstantForWindowInTimeZone,
  getPortfolioSnapshotDelta,
} from '@/lib/portfolio-snapshot-delta'
import type { PortfolioDeltaWindow } from '@/lib/portfolio-snapshot-delta'
import {
  computeAssetValueIRT,
  findBySymbol,
  getBilingualAssetLabels,
  getSellPriceBySymbol,
} from '@/lib/prices'
import {
  computeBiggestMoverFromAssetRows,
  computeBiggestMoverFromHistoricalBreakdown,
  shouldUseLivePriceChangeForBiggestMover,
} from '@/lib/portfolio-utils'
import { portfolioHistoryTimezoneSchema } from '@/lib/timezone-schema'
import {
  ensureDefaultPortfolio,
  loadAssetsWithPrices,
  MAX_PORTFOLIOS,
  requireOwnedPortfolio,
  resolveOwnedPortfolioFilter,
} from '@/server/api/helpers'
import { parseBreakdownJson } from '@/types/schemas'
import { getCachedPriceSnapshot } from '@/server/price-cache'
import { protectedProcedure, router } from '@/server/api/trpc'

const portfolioIdInput = z.string().min(1).optional()

const biggestMoverInput = z
  .object({
    window: z.enum(['1D', '1W', '1M', 'ALL']).default('1D'),
    timezone: portfolioHistoryTimezoneSchema,
    portfolioId: portfolioIdInput,
    locale: z.enum(['en', 'fa']).default('en'),
  })
  .optional()

const logSnapshotError = (err: unknown) =>
  console.error('[SNAPSHOT] Refresh failed', err)

export const portfolioRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const portfolios = await ctx.db.portfolio.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        emoji: true,
        createdAt: true,
        _count: { select: { assets: true } },
      },
    })

    return portfolios.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      createdAt: p.createdAt,
      assetCount: p._count.assets,
    }))
  }),

  /** Ensures the user has at least one portfolio (creates "Main portfolio" if none). */
  ensureDefault: protectedProcedure.mutation(({ ctx }) =>
    ensureDefaultPortfolio(ctx.db, ctx.user.id),
  ),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        emoji: z.string().max(4).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const count = await ctx.db.portfolio.count({
        where: { userId: ctx.user.id },
      })

      if (count >= MAX_PORTFOLIOS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Maximum ${MAX_PORTFOLIOS} portfolios allowed`,
        })
      }

      return ctx.db.portfolio.create({
        data: {
          userId: ctx.user.id,
          name: input.name,
          emoji: input.emoji ?? null,
        },
      })
    }),

  rename: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(50),
        emoji: z.string().max(4).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedPortfolio(ctx.db, input.id, ctx.user.id)

      return ctx.db.portfolio.update({
        where: { id: input.id },
        data: {
          name: input.name,
          ...(input.emoji !== undefined ? { emoji: input.emoji } : {}),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedPortfolio(ctx.db, input.id, ctx.user.id)

      const totalPortfolios = await ctx.db.portfolio.count({
        where: { userId: ctx.user.id },
      })

      if (totalPortfolios <= 1) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'At least one portfolio must remain',
        })
      }

      await ctx.db.portfolio.delete({ where: { id: input.id } })

      // Recreate consolidated snapshot without this portfolio's assets
      void createPortfolioSnapshot(ctx.db, ctx.user.id, null).catch(
        logSnapshotError,
      )
    }),

  history: protectedProcedure
    .input(
      z
        .object({
          window: z.enum(['1D', '1W', '1M', 'ALL']).optional(),
          timezone: portfolioHistoryTimezoneSchema,
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const chartWindow: PortfolioDeltaWindow = input?.window ?? '1D'
      const timeZone = input?.timezone ?? 'UTC'

      const firstSnapshot = await ctx.db.portfolioSnapshot.findFirst({
        where: { userId: ctx.user.id, ...portfolioFilter },
        orderBy: { snapshotAt: 'asc' },
        select: { snapshotAt: true },
      })

      const range = getPortfolioHistoryRange(
        chartWindow,
        firstSnapshot?.snapshotAt ?? null,
        timeZone,
      )

      if (!range) {
        return []
      }

      const { rangeStart, rangeEnd } = range
      const rangeEndExclusive = exclusiveEndAfterRange(rangeEnd, timeZone)

      const [carrySnapshot, snapshots] = await Promise.all([
        ctx.db.portfolioSnapshot.findFirst({
          where: {
            userId: ctx.user.id,
            ...portfolioFilter,
            snapshotAt: { lt: rangeStart },
          },
          orderBy: { snapshotAt: 'desc' },
          select: { totalIRT: true },
        }),
        ctx.db.portfolioSnapshot.findMany({
          where: {
            userId: ctx.user.id,
            ...portfolioFilter,
            snapshotAt: {
              gte: rangeStart,
              lt: rangeEndExclusive,
            },
          },
          orderBy: { snapshotAt: 'asc' },
          select: {
            snapshotAt: true,
            totalIRT: true,
          },
        }),
      ])

      const carryBeforeRange = carrySnapshot
        ? Number(carrySnapshot.totalIRT)
        : null

      return buildDailyPortfolioHistorySeries(
        rangeStart,
        rangeEnd,
        snapshots.map((s) => ({
          snapshotAt: s.snapshotAt,
          totalIRT: Number(s.totalIRT),
        })),
        carryBeforeRange,
        timeZone,
      )
    }),

  delta: protectedProcedure
    .input(
      z
        .object({
          window: z.enum(['1D', '1W', '1M', 'ALL']).default('1D'),
          timezone: portfolioHistoryTimezoneSchema,
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      const window = input?.window ?? '1D'
      const timeZone = input?.timezone ?? 'UTC'
      return getPortfolioSnapshotDelta(
        ctx.db,
        ctx.user.id,
        window,
        input?.portfolioId,
        timeZone,
      )
    }),

  biggestMover: protectedProcedure.input(biggestMoverInput).query(
    async ({ ctx, input }) => {
      const window = input?.window ?? '1D'
      const timeZone = input?.timezone ?? 'UTC'
      const locale = input?.locale ?? 'en'

      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const { userAssets, prices } = await loadAssetsWithPrices(
        ctx.db,
        ctx.user.id,
        portfolioFilter,
      )

      if (userAssets.length === 0 || prices.length === 0) return null

      const assetRows = userAssets.map((asset) => {
        const priceItem = findBySymbol(prices, asset.symbol)
        const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
        return {
          symbol: asset.symbol,
          displayNames: getBilingualAssetLabels(priceItem, asset.symbol),
          valueIRT: computeAssetValueIRT(Number(asset.quantity), sellPrice),
          change: priceItem?.change ?? null,
        }
      })

      if (shouldUseLivePriceChangeForBiggestMover(window)) {
        return computeBiggestMoverFromAssetRows(assetRows, locale)
      }

      const comparisonInstant = getComparisonInstantForWindowInTimeZone(
        window,
        timeZone,
      )
      if (!comparisonInstant) {
        return computeBiggestMoverFromAssetRows(assetRows, locale)
      }

      const prevSnap = await ctx.db.portfolioSnapshot.findFirst({
        where: {
          userId: ctx.user.id,
          ...portfolioFilter,
          snapshotAt: { lte: comparisonInstant },
        },
        orderBy: { snapshotAt: 'desc' },
        select: { breakdown: true },
      })

      if (!prevSnap) {
        return computeBiggestMoverFromAssetRows(assetRows, locale)
      }

      const breakdownItems = parseBreakdownJson(prevSnap.breakdown)
      const prevBySymbol = new Map<string, number>()
      for (const row of breakdownItems) {
        prevBySymbol.set(row.symbol, row.valueIRT)
      }

      return computeBiggestMoverFromHistoricalBreakdown(
        prevBySymbol,
        assetRows,
        locale,
      )
    },
  ),

  breakdown: protectedProcedure
    .input(
      z
        .object({
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const { userAssets, prices } = await loadAssetsWithPrices(
        ctx.db,
        ctx.user.id,
        portfolioFilter,
      )

      if (userAssets.length === 0) return null

      return computeLivePortfolioBreakdown(userAssets, prices)
    }),

  export: protectedProcedure
    .input(
      z
        .object({
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const [snapshots, cached] = await Promise.all([
        ctx.db.portfolioSnapshot.findMany({
          where: { userId: ctx.user.id, ...portfolioFilter },
          orderBy: { snapshotAt: 'asc' },
          select: {
            snapshotAt: true,
            totalIRT: true,
            breakdown: true,
          },
        }),
        getCachedPriceSnapshot(ctx.db),
      ])

      const usdSellPrice = getSellPriceBySymbol('USD', cached?.prices ?? [])

      const header = 'date,totalIRT,totalUSD,breakdown_json'
      const rows = snapshots.map((s) => {
        const totalIRT = Number(s.totalIRT)
        const totalUSD =
          usdSellPrice > 0 ? (totalIRT / usdSellPrice).toFixed(2) : ''
        const date = s.snapshotAt.toISOString().split('T')[0] ?? ''
        const breakdown = JSON.stringify(s.breakdown).replace(/"/g, '""')
        return `${date},${totalIRT},"${totalUSD}","${breakdown}"`
      })

      const csv = [header, ...rows].join('\n')
      return { csv, rowCount: snapshots.length }
    }),
})
