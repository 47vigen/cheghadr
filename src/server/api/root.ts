import { createCallerFactory, router } from '@/server/api/trpc'

import { alertsRouter } from './routers/alerts'
import { assetsRouter } from './routers/assets'
import { portfolioRouter } from './routers/portfolio'
import { pricesRouter } from './routers/prices'

export const appRouter = router({
  prices: pricesRouter,
  assets: assetsRouter,
  portfolio: portfolioRouter,
  alerts: alertsRouter,
})

export type AppRouter = typeof appRouter

export const createCaller = createCallerFactory(appRouter)
