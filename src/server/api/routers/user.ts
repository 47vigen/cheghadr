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
})
