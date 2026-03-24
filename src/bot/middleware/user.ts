import type { NextFunction } from 'grammy'

import { db } from '@/server/db'

import type { BotContext } from '../context'

/**
 * Find-or-create a User record for every incoming update.
 * Mirrors the protectedProcedure pattern in src/server/api/trpc.ts:56-68.
 */
export async function userMiddleware(
  ctx: BotContext,
  next: NextFunction,
): Promise<void> {
  const fromId = ctx.from?.id
  if (!fromId) {
    return next()
  }

  const telegramUserId = BigInt(fromId)
  const user = await db.user.upsert({
    where: { telegramUserId },
    update: {},
    create: { telegramUserId },
    select: {
      id: true,
      telegramUserId: true,
      preferredLocale: true,
      dailyDigestEnabled: true,
    },
  })

  ctx.botUser = {
    id: user.id,
    telegramUserId: user.telegramUserId,
    preferredLocale: user.preferredLocale as 'en' | 'fa',
    dailyDigestEnabled: user.dailyDigestEnabled,
  }

  return next()
}
