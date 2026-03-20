import { router } from '@/server/api/trpc'

import { alertsRouter } from './routers/alerts'
import { assetsRouter } from './routers/assets'
import { portfolioRouter } from './routers/portfolio'
import { pricesRouter } from './routers/prices'
import { userRouter } from './routers/user'

export const appRouter = router({
  prices: pricesRouter,
  assets: assetsRouter,
  portfolio: portfolioRouter,
  alerts: alertsRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
