import type { inferRouterOutputs } from '@trpc/server'

import type { AppRouter } from '@/server/api/root'

type RouterOutputs = inferRouterOutputs<AppRouter>

export type PortfolioListItem = RouterOutputs['portfolio']['list'][number]
export type PortfolioHistoryData = RouterOutputs['portfolio']['history']
export type PortfolioBreakdownData = RouterOutputs['portfolio']['breakdown']
export type AssetListEntry = RouterOutputs['assets']['list']['assets'][number]
export type AlertEntry = RouterOutputs['alerts']['list'][number]
export type PriceLatest = RouterOutputs['prices']['latest']
