import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { computeLivePortfolioBreakdown } from '@/lib/portfolio-breakdown'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import { getPortfolioSnapshotDelta } from '@/lib/portfolio-snapshot-delta'
import {
  getSellPriceBySymbol,
  parsePriceSnapshot,
} from '@/lib/prices'
import {
  ensureDefaultPortfolio,
  requireOwnedPortfolio,
  resolveOwnedPortfolioFilter,
} from '@/server/api/helpers'
import { protectedProcedure, router } from '@/server/api/trpc'

const MAX_PORTFOLIOS = 10

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
    .query(({ ctx, input }) => {
      const window = input?.window ?? '1D'
      return getPortfolioSnapshotDelta(
        ctx.db,
        ctx.user.id,
        window,
        input?.portfolioId,
      )
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
      if (input?.portfolioId) {
        await requireOwnedPortfolio(ctx.db, input.portfolioId, ctx.user.id)
      }

      const whereClause = input?.portfolioId
        ? { userId: ctx.user.id, portfolioId: input.portfolioId }
        : { userId: ctx.user.id }

      const [userAssets, priceSnap] = await Promise.all([
        ctx.db.userAsset.findMany({
          where: whereClause,
          orderBy: { createdAt: 'asc' },
        }),
        ctx.db.priceSnapshot.findFirst({
          orderBy: { snapshotAt: 'desc' },
        }),
      ])

      if (userAssets.length === 0) return null

      const prices = parsePriceSnapshot(priceSnap?.data)
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
