import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'

export async function requireOwnedPortfolio(
  db: PrismaClient,
  id: string,
  userId: string,
) {
  const portfolio = await db.portfolio.findUnique({ where: { id } })
  if (!portfolio || portfolio.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  return portfolio
}
