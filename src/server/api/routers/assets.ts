import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createPortfolioSnapshot } from '@/lib/portfolio'
import {
  findBySymbol,
  getBilingualAssetLabels,
  getSellPriceBySymbol,
  getSnapshotStaleness,
  parsePriceSnapshot,
} from '@/lib/prices'
import { protectedProcedure, router } from '@/server/api/trpc'

async function requireOwnedAsset(
  database: PrismaClient,
  id: string,
  userId: string,
) {
  const asset = await database.userAsset.findUnique({ where: { id } })
  if (!asset || asset.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  return asset
}

const quantitySchema = z.string().refine(
  (v) => {
    const n = Number(v)
    return !Number.isNaN(n) && n > 0
  },
  { message: 'مقدار باید عددی مثبت باشد' },
)

export const assetsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const [userAssets, snapshot] = await Promise.all([
      ctx.db.userAsset.findMany({
        where: { userId: ctx.user.id },
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.userAsset.upsert({
        where: {
          userId_symbol: { userId: ctx.user.id, symbol: input.symbol },
        },
        update: { quantity: input.quantity },
        create: {
          userId: ctx.user.id,
          symbol: input.symbol,
          quantity: input.quantity,
        },
      })
      void createPortfolioSnapshot(ctx.db, ctx.user.id)
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
      await requireOwnedAsset(ctx.db, input.id, ctx.user.id)
      const asset = await ctx.db.userAsset.update({
        where: { id: input.id, userId: ctx.user.id },
        data: { quantity: input.quantity },
      })
      void createPortfolioSnapshot(ctx.db, ctx.user.id)
      return asset
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedAsset(ctx.db, input.id, ctx.user.id)
      await ctx.db.userAsset.delete({
        where: { id: input.id, userId: ctx.user.id },
      })
      void createPortfolioSnapshot(ctx.db, ctx.user.id)
    }),
})
