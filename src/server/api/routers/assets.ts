import { z } from 'zod'

import {
  findBySymbol,
  getBilingualAssetLabels,
  getSellPriceBySymbol,
  getSnapshotStaleness,
  parsePriceSnapshot,
} from '@/lib/prices'
import {
  positiveDecimalStringSchema,
  refreshPortfolioSnapshotsAfterAssetChange,
  requireOwnedAsset,
  requireOwnedPortfolio,
} from '@/server/api/helpers'
import { protectedProcedure, router } from '@/server/api/trpc'

const quantitySchema = positiveDecimalStringSchema(
  'Quantity must be a positive number',
)

export const assetsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          portfolioId: z.string().min(1).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input?.portfolioId
        ? { userId: ctx.user.id, portfolioId: input.portfolioId }
        : { userId: ctx.user.id }

      const [userAssets, snapshot] = await Promise.all([
        ctx.db.userAsset.findMany({
          where: whereClause,
          orderBy: { createdAt: 'asc' },
        }),
        ctx.db.priceSnapshot.findFirst({
          orderBy: { snapshotAt: 'desc' },
        }),
      ])

      const prices = parsePriceSnapshot(snapshot?.data)

      const assets = userAssets.map((asset) => {
        const priceItem = findBySymbol(prices, asset.symbol)
        const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
        const qty = Number(asset.quantity)
        return {
          ...asset,
          valueIRT: qty * sellPrice,
          displayNames: getBilingualAssetLabels(priceItem, asset.symbol),
          assetIcon: priceItem?.png ?? priceItem?.base_currency?.png ?? null,
          change: priceItem?.change ?? null,
          sellPrice,
          category: priceItem?.base_currency.category?.symbol ?? 'OTHER',
        }
      })

      const totalIRT = assets.reduce((sum, a) => sum + a.valueIRT, 0)

      const { stale } = getSnapshotStaleness(snapshot?.snapshotAt)

      const usdSellPrice = getSellPriceBySymbol('USD', prices)
      const eurSellPrice = getSellPriceBySymbol('EUR', prices)

      return {
        assets,
        totalIRT,
        snapshotAt: snapshot?.snapshotAt ?? null,
        stale,
        usdSellPrice: usdSellPrice > 0 ? usdSellPrice : null,
        eurSellPrice: eurSellPrice > 0 ? eurSellPrice : null,
      }
    }),

  add: protectedProcedure
    .input(
      z.object({
        symbol: z.string().min(1),
        quantity: quantitySchema,
        portfolioId: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnedPortfolio(ctx.db, input.portfolioId, ctx.user.id)

      const asset = await ctx.db.userAsset.upsert({
        where: {
          userId_symbol_portfolioId: {
            userId: ctx.user.id,
            symbol: input.symbol,
            portfolioId: input.portfolioId,
          },
        },
        update: { quantity: input.quantity },
        create: {
          userId: ctx.user.id,
          portfolioId: input.portfolioId,
          symbol: input.symbol,
          quantity: input.quantity,
        },
      })

      refreshPortfolioSnapshotsAfterAssetChange(
        ctx.db,
        ctx.user.id,
        input.portfolioId,
      )

      return asset
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        quantity: quantitySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await requireOwnedAsset(ctx.db, input.id, ctx.user.id)
      const updated = await ctx.db.userAsset.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { quantity: input.quantity },
      })

      refreshPortfolioSnapshotsAfterAssetChange(
        ctx.db,
        ctx.user.id,
        asset.portfolioId,
      )

      return updated
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const asset = await requireOwnedAsset(ctx.db, input.id, ctx.user.id)
      await ctx.db.userAsset.delete({
        where: { id: input.id, userId: ctx.user.id },
      })

      refreshPortfolioSnapshotsAfterAssetChange(
        ctx.db,
        ctx.user.id,
        asset.portfolioId,
      )
    }),
})
