import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createPortfolioSnapshot } from '@/lib/portfolio'
import {
  findBySymbol,
  getSellPriceBySymbol,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import {
  ensureDefaultPortfolio,
  requireOwnedPortfolio,
  resolveOwnedPortfolioFilter,
} from '@/server/api/helpers'
import { protectedProcedure, router } from '@/server/api/trpc'
import type { BreakdownItem } from '@/types/schemas'
import { parseBreakdownJson } from '@/types/schemas'

const MAX_PORTFOLIOS = 10

function getComparisonDate(window: string): Date | null {
  const now = new Date()
  switch (window) {
    case '1D':
      now.setDate(now.getDate() - 1)
      return now
    case '1W':
      now.setDate(now.getDate() - 7)
      return now
    case '1M':
      now.setMonth(now.getMonth() - 1)
      return now
    case 'ALL':
      return null
    default:
      return null
  }
}

const portfolioIdInput = z.string().min(1).optional()

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

  /** Ensures the user has at least one portfolio (creates "سبد اصلی" if none). */
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
          message: `حداکثر ${MAX_PORTFOLIOS} سبد مجاز است`,
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
          message: 'حداقل یک سبد باید وجود داشته باشد',
        })
      }

      await ctx.db.portfolio.delete({ where: { id: input.id } })

      // Recreate consolidated snapshot without this portfolio's assets
      void createPortfolioSnapshot(ctx.db, ctx.user.id, null)
    }),

  history: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(365).default(30),
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30
      const since = new Date()
      since.setDate(since.getDate() - days)

      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const snapshots = await ctx.db.portfolioSnapshot.findMany({
        where: {
          userId: ctx.user.id,
          ...portfolioFilter,
          snapshotAt: { gte: since },
        },
        orderBy: { snapshotAt: 'asc' },
        select: {
          snapshotAt: true,
          totalIRT: true,
        },
      })

      return snapshots.map((s) => ({
        date: s.snapshotAt,
        totalIRT: Number(s.totalIRT),
      }))
    }),

  delta: protectedProcedure
    .input(
      z
        .object({
          window: z.enum(['1D', '1W', '1M', 'ALL']).default('1D'),
          portfolioId: portfolioIdInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const window = input?.window ?? '1D'

      const portfolioFilter = await resolveOwnedPortfolioFilter(
        ctx.db,
        ctx.user.id,
        input?.portfolioId,
      )

      const current = await ctx.db.portfolioSnapshot.findFirst({
        where: { userId: ctx.user.id, ...portfolioFilter },
        orderBy: { snapshotAt: 'desc' },
        select: { id: true, snapshotAt: true, totalIRT: true },
      })

      if (!current) return null

      const comparisonDate = getComparisonDate(window)

      const previous = comparisonDate
        ? await ctx.db.portfolioSnapshot.findFirst({
            where: {
              userId: ctx.user.id,
              ...portfolioFilter,
              snapshotAt: { lte: comparisonDate },
            },
            orderBy: { snapshotAt: 'desc' },
            select: { id: true, snapshotAt: true, totalIRT: true },
          })
        : await ctx.db.portfolioSnapshot.findFirst({
            where: { userId: ctx.user.id, ...portfolioFilter },
            orderBy: { snapshotAt: 'asc' },
            select: { id: true, snapshotAt: true, totalIRT: true },
          })

      if (!previous || previous.id === current.id) return null

      const currentIRT = Number(current.totalIRT)
      const previousIRT = Number(previous.totalIRT)
      const deltaIRT = currentIRT - previousIRT
      const deltaPct = previousIRT !== 0 ? (deltaIRT / previousIRT) * 100 : 0

      return { currentIRT, previousIRT, deltaIRT, deltaPct }
    }),

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

      const [latestSnap, priceSnap] = await Promise.all([
        ctx.db.portfolioSnapshot.findFirst({
          where: { userId: ctx.user.id, ...portfolioFilter },
          orderBy: { snapshotAt: 'desc' },
          select: { totalIRT: true, breakdown: true },
        }),
        ctx.db.priceSnapshot.findFirst({
          orderBy: { snapshotAt: 'desc' },
        }),
      ])

      if (!latestSnap) return null

      const prices = parsePriceSnapshot(priceSnap?.data)
      const totalIRT = Number(latestSnap.totalIRT)
      if (totalIRT === 0) return null

      const items: BreakdownItem[] = parseBreakdownJson(latestSnap.breakdown)

      const categoryMap = new Map<
        string,
        { valueIRT: number; assets: BreakdownItem[] }
      >()

      for (const item of items) {
        const priceItem = findBySymbol(prices, item.symbol)
        const category = priceItem?.base_currency.category?.symbol ?? 'OTHER'
        const existing = categoryMap.get(category) ?? {
          valueIRT: 0,
          assets: [],
        }
        existing.valueIRT += item.valueIRT
        existing.assets.push(item)
        categoryMap.set(category, existing)
      }

      const categories = sortedGroupEntries(categoryMap).map(
        ([category, bucket]) => ({
          category,
          valueIRT: bucket.valueIRT,
          percentage: (bucket.valueIRT / totalIRT) * 100,
          assets: bucket.assets.map((a) => ({
            ...a,
            percentage: (a.valueIRT / totalIRT) * 100,
          })),
        }),
      )

      return { totalIRT, categories }
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

      const [snapshots, priceSnap] = await Promise.all([
        ctx.db.portfolioSnapshot.findMany({
          where: { userId: ctx.user.id, ...portfolioFilter },
          orderBy: { snapshotAt: 'asc' },
          select: {
            snapshotAt: true,
            totalIRT: true,
            breakdown: true,
          },
        }),
        ctx.db.priceSnapshot.findFirst({
          orderBy: { snapshotAt: 'desc' },
        }),
      ])

      const prices = parsePriceSnapshot(priceSnap?.data)
      const usdSellPrice = getSellPriceBySymbol('USD', prices)

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
