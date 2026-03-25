import { z } from 'zod'

import { protectedProcedure, router } from '@/server/api/trpc'

export const userRouter = router({
  setPreferredLocale: protectedProcedure
    .input(z.object({ locale: z.enum(['en', 'fa']) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { preferredLocale: input.locale },
      })
    }),

  getSettings: protectedProcedure.query(({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.user.id },
      select: { dailyDigestEnabled: true, isOnboarded: true },
    })
  }),

  toggleDailyDigest: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: ctx.user.id },
        data: { dailyDigestEnabled: input.enabled },
      })
    }),

  completeOnboarding: protectedProcedure
    .input(z.object({ locale: z.enum(['en', 'fa']).optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: ctx.user.id },
        data: {
          isOnboarded: true,
          ...(input.locale ? { preferredLocale: input.locale } : {}),
        },
      })
    }),
})
