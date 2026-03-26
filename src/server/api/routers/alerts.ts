import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { findBySymbol } from '@/lib/prices'
import {
  assertUnderMaxActiveAlerts,
  positiveDecimalStringSchema,
  requireOwnedAlert,
} from '@/server/api/helpers'
import { getCachedPriceSnapshot } from '@/server/price-cache'
import { protectedProcedure, router } from '@/server/api/trpc'

const thresholdSchema = positiveDecimalStringSchema(
  'Threshold must be a positive number',
)

export const alertsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return ctx.db.alert.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: 'desc' },
    })
  }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(['PRICE', 'PORTFOLIO']),
        symbol: z.string().min(1).optional(),
        direction: z.enum(['ABOVE', 'BELOW']),
        thresholdIRT: thresholdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === 'PRICE' && !input.symbol) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Asset symbol is required for price alerts',
        })
      }

      await assertUnderMaxActiveAlerts(ctx.db, ctx.user.id)

      if (input.type === 'PRICE' && input.symbol) {
        const cached = await getCachedPriceSnapshot(ctx.db)

        if (!cached) {
          throw new TRPCError({
            code: 'SERVICE_UNAVAILABLE',
            message: 'Price data is not available yet',
          })
        }

        const item = findBySymbol(cached.prices, input.symbol)
        if (!item) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid asset symbol',
          })
        }
      }

      return ctx.db.alert.create({
        data: {
          userId: ctx.user.id,
          type: input.type,
          symbol: input.symbol ?? null,
          direction: input.direction,
          thresholdIRT: input.thresholdIRT,
        },
      })
    }),

  toggle: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const alert = await requireOwnedAlert(ctx.db, input.id, ctx.user.id)

      if (!alert.isActive) {
        await assertUnderMaxActiveAlerts(ctx.db, ctx.user.id)
      }

      return ctx.db.alert.update({
        where: { id: input.id },
        data: {
          isActive: !alert.isActive,
          // Clear triggeredAt when re-enabling
          ...(alert.isActive ? {} : { triggeredAt: null }),
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnedAlert(ctx.db, input.id, ctx.user.id)
      await ctx.db.alert.delete({
        where: { id: input.id },
      })
    }),
})
