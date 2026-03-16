import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { protectedProcedure, router } from '@/server/api/trpc'

const STALE_AFTER_MINUTES = 60

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
      const sellPrice = priceItem ? Number(priceItem.sell_price) : 0
      const qty = Number(asset.quantity)
      return {
        ...asset,
        valueIRT: qty * sellPrice,
        assetName: priceItem?.name.fa ?? asset.symbol,
        assetNameEn: priceItem?.name.en ?? asset.symbol,
        assetIcon: priceItem?.png ?? priceItem?.base_currency.png ?? null,
        change: priceItem?.change ?? null,
        sellPrice,
      }
    })

    const totalIRT = assets.reduce((sum, a) => sum + a.valueIRT, 0)

    const minutesOld = snapshot
      ? (Date.now() - snapshot.snapshotAt.getTime()) / 1000 / 60
      : Infinity
    const stale = minutesOld > STALE_AFTER_MINUTES

    return {
      assets,
      totalIRT,
      snapshotAt: snapshot?.snapshotAt ?? null,
      stale,
    }
  }),

  add: protectedProcedure
    .input(
      z.object({
        symbol: z.string().min(1),
        quantity: quantitySchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      return ctx.db.userAsset.upsert({
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
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        quantity: quantitySchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.userAsset.findUnique({
        where: { id: input.id },
      })
      if (!asset || asset.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      return ctx.db.userAsset.update({
        where: { id: input.id },
        data: { quantity: input.quantity },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.userAsset.findUnique({
        where: { id: input.id },
      })
      if (!asset || asset.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' })
      }
      await ctx.db.userAsset.delete({ where: { id: input.id } })
    }),
})
