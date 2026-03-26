import { getSnapshotStaleness } from '@/lib/prices'
import { fetchLatestPriceSnapshot } from '@/server/api/helpers'
import { publicProcedure, router } from '@/server/api/trpc'

export const pricesRouter = router({
  latest: publicProcedure.query(async ({ ctx }) => {
    const snapshot = await fetchLatestPriceSnapshot(ctx.db)

    if (!snapshot) {
      return { data: null, stale: true, snapshotAt: null }
    }

    const { stale } = getSnapshotStaleness(snapshot.snapshotAt)

    return {
      data: snapshot.data,
      stale,
      snapshotAt: snapshot.snapshotAt,
    }
  }),
})
