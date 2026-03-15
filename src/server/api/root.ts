import { createCallerFactory, router } from '@/server/api/trpc'

import { assetsRouter } from './routers/assets'
import { pricesRouter } from './routers/prices'

export const appRouter = router({
  prices: pricesRouter,
  assets: assetsRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
