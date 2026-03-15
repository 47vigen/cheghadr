import { publicProcedure, router } from '@/server/api/trpc'

const STALE_AFTER_MINUTES = 60

export const pricesRouter = router({
  latest: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await ctx.db.priceSnapshot.findFirst({
      orderBy: { snapshotAt: 'desc' },
    })

    if (!snapshot) {
      return { data: null, stale: true, snapshotAt: null }
    }

    const minutesOld = (Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60
    const stale = minutesOld > STALE_AFTER_MINUTES

    return {
      data: snapshot.data,
      stale,
      snapshotAt: snapshot.snapshotAt,
    }
  }),
})
