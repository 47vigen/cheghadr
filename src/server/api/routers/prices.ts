import { publicProcedure, router } from '@/server/api/trpc'

export const pricesRouter = router({
  latest: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })

    if (!snapshot) {
      return { data: null, stale: true, snapshotAt: null }
    }

    const minutesOld = (Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60
    const stale = minutesOld > 60

    return {
      data: snapshot.data,
      stale,
      snapshotAt: snapshot.snapshotAt,
    }
  }),
})
