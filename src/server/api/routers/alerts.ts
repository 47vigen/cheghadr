import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { MAX_ACTIVE_ALERTS } from '@/lib/alert-utils'
import { findBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { protectedProcedure, router } from '@/server/api/trpc'

async function requireOwnedAlert(
  database: PrismaClient,
  id: string,
  userId: string,
) {
  const alert = await database.alert.findUnique({ where: { id } })
  if (!alert || alert.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  return alert
}

const thresholdSchema = z
  .string()
  .refine(
    (v) => {
      const n = Number(v)
      return !Number.isNaN(n) && n > 0
    },
    { message: 'آستانه باید عددی مثبت باشد' },
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
          message: 'نماد دارایی برای هشدار قیمت الزامی است',
        })
      }

      const activeCount = await ctx.db.alert.count({
        where: { userId: ctx.user.id, isActive: true },
      })

      if (activeCount >= MAX_ACTIVE_ALERTS) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `حداکثر ${MAX_ACTIVE_ALERTS} هشدار فعال مجاز است`,
        })
      }

      if (input.type === 'PRICE' && input.symbol) {
        const latestSnapshot = await ctx.db.priceSnapshot.findFirst({
          orderBy: { snapshotAt: 'desc' },
        })

        if (latestSnapshot) {
          const prices = parsePriceSnapshot(latestSnapshot.data)
          const item = findBySymbol(prices, input.symbol)
          if (!item) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'نماد دارایی معتبر نیست',
            })
          }
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
        const activeCount = await ctx.db.alert.count({
          where: { userId: ctx.user.id, isActive: true },
        })
        if (activeCount >= MAX_ACTIVE_ALERTS) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `حداکثر ${MAX_ACTIVE_ALERTS} هشدار فعال مجاز است`,
          })
        }
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

  settings: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { dailyDigestEnabled: true },
    })
  }),

  toggleDigest: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { dailyDigestEnabled: input.enabled },
      })
    }),
})
