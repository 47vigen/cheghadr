import type { PrismaClient } from '@prisma/client'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import { createPortfolioSnapshot } from '@/lib/portfolio'
import type { PriceItem } from '@/lib/prices'
import { getCachedPriceSnapshot } from '@/server/price-cache'

/** Maximum number of portfolios a user may own. */
export const MAX_PORTFOLIOS = 10

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

/** `UserAsset` rows for a user, optionally scoped to one portfolio (omit when consolidated). */
export function userAssetsWhereClause(
  userId: string,
  portfolioFilter: { portfolioId: string } | { portfolioId: null },
): { userId: string } | { userId: string; portfolioId: string } {
  return portfolioFilter.portfolioId === null
    ? { userId }
    : { userId, portfolioId: portfolioFilter.portfolioId }
}

export interface AssetsWithPrices {
  userAssets: Awaited<ReturnType<PrismaClient['userAsset']['findMany']>>
  prices: PriceItem[]
  snapshotAt: Date | null
}

/**
 * Fetches user assets and the latest price snapshot in parallel, using the
 * shared price cache. All procedures that need both should call this instead
 * of issuing two independent queries.
 */
export async function loadAssetsWithPrices(
  db: PrismaClient,
  userId: string,
  portfolioFilter: { portfolioId: string } | { portfolioId: null },
): Promise<AssetsWithPrices> {
  const where = userAssetsWhereClause(userId, portfolioFilter)
  const [userAssets, cached] = await Promise.all([
    db.userAsset.findMany({ where, orderBy: { createdAt: 'asc' } }),
    getCachedPriceSnapshot(db),
  ])
  return {
    userAssets,
    prices: cached?.prices ?? [],
    snapshotAt: cached?.snapshotAt ?? null,
  }
}

/**
 * Throws BAD_REQUEST when the user has already reached {@link MAX_ACTIVE_ALERTS}.
 * Call before creating or re-enabling an alert.
 */
export async function assertUnderMaxActiveAlerts(
  db: PrismaClient,
  userId: string,
): Promise<void> {
  const count = await db.alert.count({ where: { userId, isActive: true } })
  if (count >= MAX_ACTIVE_ALERTS) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Maximum ${MAX_ACTIVE_ALERTS} active alerts allowed`,
    })
  }
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
