import { initTRPC, TRPCError } from '@trpc/server'
import SuperJSON from 'superjson'

import { auth } from '@/server/auth/config'
import { validateInitData } from '@/server/auth/telegram'
import { db } from '@/server/db'

export async function createTRPCContext(opts: { headers: Headers }) {
  let telegramUserId: bigint | null = null

  // Path 1: Telegram Mini App — validate initData header
  const initData = opts.headers.get('x-telegram-init-data')
  if (initData && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      const result = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN)
      if (result.valid && result.user) {
        telegramUserId = BigInt(result.user.id)
      }
    } catch {
      // Invalid initData — treat as unauthenticated
    }
  }

  // Path 2: Standalone browser — read NextAuth session
  if (!telegramUserId) {
    try {
      const session = await auth()
      const sessionAny = session as Record<string, unknown> | null
      const rawId = sessionAny?.telegramUserId
      if (rawId && typeof rawId === 'string' && /^\d+$/.test(rawId)) {
        telegramUserId = BigInt(rawId)
      }
    } catch {
      // Invalid session — treat as unauthenticated
    }
  }

  // Path 3: Dev bypass — use env user when no session/initData
  if (
    !telegramUserId &&
    process.env.NODE_ENV === 'development' &&
    process.env.DEV_TELEGRAM_USER_ID
  ) {
    telegramUserId = BigInt(process.env.DEV_TELEGRAM_USER_ID)
  }

  return { db, telegramUserId }
}

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  transformer: SuperJSON,
})

export const { createCallerFactory, router } = t

export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.telegramUserId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  // Find-or-create user record on first login
  const user = await ctx.db.user.upsert({
    where: { telegramUserId: ctx.telegramUserId },
    update: {},
    create: { telegramUserId: ctx.telegramUserId },
  })

  return next({ ctx: { ...ctx, user } })
})
