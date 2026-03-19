import { z } from 'zod'

import { categoryOrder, findBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { protectedProcedure, router } from '@/server/api/trpc'

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

export const portfolioRouter = router({
  history: protectedProcedure
    .input(
      z
        .object({
          days: z.number().int().min(1).max(365).default(30),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const days = input?.days ?? 30
      const since = new Date()
      since.setDate(since.getDate() - days)

      const snapshots = await ctx.db.portfolioSnapshot.findMany({
        where: {
          userId: ctx.user.id,
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
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const window = input?.window ?? '1D'

      const current = await ctx.db.portfolioSnapshot.findFirst({
        where: { userId: ctx.user.id },
        orderBy: { snapshotAt: 'desc' },
        select: { id: true, snapshotAt: true, totalIRT: true },
      })

      if (!current) return null

      const comparisonDate = getComparisonDate(window)

      const previous = comparisonDate
        ? await ctx.db.portfolioSnapshot.findFirst({
            where: {
              userId: ctx.user.id,
              snapshotAt: { lte: comparisonDate },
            },
            orderBy: { snapshotAt: 'desc' },
            select: { id: true, snapshotAt: true, totalIRT: true },
          })
        : await ctx.db.portfolioSnapshot.findFirst({
            where: { userId: ctx.user.id },
            orderBy: { snapshotAt: 'asc' },
            select: { id: true, snapshotAt: true, totalIRT: true },
          })

      if (!previous || previous.id === current.id) return null

      const currentIRT = Number(current.totalIRT)
      const previousIRT = Number(previous.totalIRT)
      const deltaIRT = currentIRT - previousIRT
      const deltaPct =
        previousIRT !== 0 ? (deltaIRT / previousIRT) * 100 : 0

      return { currentIRT, previousIRT, deltaIRT, deltaPct }
    }),

  breakdown: protectedProcedure.query(async ({ ctx }) => {
    const [latestSnap, priceSnap] = await Promise.all([
      ctx.db.portfolioSnapshot.findFirst({
        where: { userId: ctx.user.id },
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

    type BreakdownItem = { symbol: string; quantity: number; valueIRT: number }
    const items = latestSnap.breakdown as BreakdownItem[]

    const categoryMap = new Map<
      string,
      { valueIRT: number; assets: BreakdownItem[] }
    >()

    for (const item of items) {
      const priceItem = findBySymbol(prices, item.symbol)
      const category =
        priceItem?.base_currency.category?.symbol ?? 'OTHER'
      const existing = categoryMap.get(category) ?? {
        valueIRT: 0,
        assets: [],
      }
      existing.valueIRT += item.valueIRT
      existing.assets.push(item)
      categoryMap.set(category, existing)
    }

    const result: Array<{
      category: string
      valueIRT: number
      percentage: number
      assets: Array<{
        symbol: string
        quantity: number
        valueIRT: number
        percentage: number
      }>
    }> = []

    for (const cat of categoryOrder) {
      const data = categoryMap.get(cat)
      if (!data) continue
      result.push({
        category: cat,
        valueIRT: data.valueIRT,
        percentage: (data.valueIRT / totalIRT) * 100,
        assets: data.assets.map((a) => ({
          ...a,
          percentage: (a.valueIRT / totalIRT) * 100,
        })),
      })
    }

    for (const [cat, data] of categoryMap) {
      if (!categoryOrder.includes(cat)) {
        result.push({
          category: cat,
          valueIRT: data.valueIRT,
          percentage: (data.valueIRT / totalIRT) * 100,
          assets: data.assets.map((a) => ({
            ...a,
            percentage: (a.valueIRT / totalIRT) * 100,
          })),
        })
      }
    }

    return { totalIRT, categories: result }
  }),
})
