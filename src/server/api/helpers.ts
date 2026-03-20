import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createPortfolioSnapshot } from '@/lib/portfolio'

type OwnedRecord = { userId: string }

async function requireOwnedRecord<T extends OwnedRecord>(
  findUnique: () => Promise<T | null>,
  userId: string,
): Promise<T> {
  const record = await findUnique()
  if (!record || record.userId !== userId) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  return record
}

export function positiveDecimalStringSchema(message: string) {
  return z.string().refine(
    (v) => {
      const n = Number(v)
      return !Number.isNaN(n) && n > 0
    },
    { message },
  )
}

export function requireOwnedPortfolio(
  db: PrismaClient,
  id: string,
  userId: string,
) {
  return requireOwnedRecord(
    () => db.portfolio.findUnique({ where: { id } }),
    userId,
  )
}

export function requireOwnedAsset(
  db: PrismaClient,
  id: string,
  userId: string,
) {
  return requireOwnedRecord(
    () => db.userAsset.findUnique({ where: { id } }),
    userId,
  )
}

export function requireOwnedAlert(
  db: PrismaClient,
  id: string,
  userId: string,
) {
  return requireOwnedRecord(
    () => db.alert.findUnique({ where: { id } }),
    userId,
  )
}

/** After mutating assets, refresh per-portfolio and consolidated snapshots. */
export function refreshPortfolioSnapshotsAfterAssetChange(
  db: PrismaClient,
  userId: string,
  portfolioId: string,
) {
  void createPortfolioSnapshot(db, userId, portfolioId)
  void createPortfolioSnapshot(db, userId, null)
}
