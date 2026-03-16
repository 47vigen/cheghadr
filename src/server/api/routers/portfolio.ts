import { z } from 'zod'

import { protectedProcedure, router } from '@/server/api/trpc'

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
})
