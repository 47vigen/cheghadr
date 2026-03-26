import { getSnapshotStaleness } from '@/lib/prices'
import { publicProcedure, router } from '@/server/api/trpc'
import { getCachedPriceSnapshot } from '@/server/price-cache'

export const pricesRouter = router({
  latest: publicProcedure.query(async ({ ctx }) => {
    const cached = await getCachedPriceSnapshot(ctx.db)

    if (!cached) {
      return { data: null, stale: true, snapshotAt: null }
    }

    const { stale } = getSnapshotStaleness(cached.snapshotAt)

    return {
      data: cached.data,
      stale,
      snapshotAt: cached.snapshotAt,
    }
  }),
})
