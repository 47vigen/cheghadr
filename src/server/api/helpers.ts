import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { createPortfolioSnapshot } from '@/lib/portfolio'

/** Default portfolio name when auto-creating (matches web `portfolio.ensureDefault`). */
export const DEFAULT_PORTFOLIO_NAME = 'Main portfolio'

type OwnedRecord = { userId: string }

/** Ensures the user has at least one portfolio; creates {@link DEFAULT_PORTFOLIO_NAME} if none. */
export async function ensureDefaultPortfolio(
  db: PrismaClient,
  userId: string,
): Promise<{ id: string }> {
  const existing = await db.portfolio.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (existing) return existing
  return db.portfolio.create({
    data: {
      userId,
      name: DEFAULT_PORTFOLIO_NAME,
    },
    select: { id: true },
  })
}

async function requireOwnedRecord<T extends OwnedRecord>(
  findUnique: () => Promise<T | null>,
  userId: string,
): Promise<T> {
  const record = await findUnique()
  if (!record) {
    throw new TRPCError({ code: 'NOT_FOUND' })
  }
  if (record.userId !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN' })
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

/** Validates optional portfolio ownership and returns Prisma filter for consolidated vs single portfolio. */
export async function resolveOwnedPortfolioFilter(
  db: PrismaClient,
  userId: string,
  portfolioId?: string,
): Promise<{ portfolioId: string } | { portfolioId: null }> {
  if (portfolioId) {
    await requireOwnedPortfolio(db, portfolioId, userId)
    return { portfolioId }
  }
  return { portfolioId: null }
}

/** After mutating assets, refresh per-portfolio and consolidated snapshots. */
export function refreshPortfolioSnapshotsAfterAssetChange(
  db: PrismaClient,
  userId: string,
  portfolioId: string,
) {
  const logSnapshotError = (err: unknown) =>
    console.error('[SNAPSHOT] Refresh failed', err)
  void createPortfolioSnapshot(db, userId, portfolioId).catch(logSnapshotError)
  void createPortfolioSnapshot(db, userId, null).catch(logSnapshotError)
}
