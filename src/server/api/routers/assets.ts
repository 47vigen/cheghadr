import { protectedProcedure, router } from '@/server/api/trpc'

// Placeholder — ships in Phase 2
export const assetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db.userAsset.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'asc' },
    })
  }),
})
