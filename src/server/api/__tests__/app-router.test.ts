import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/auth/config', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('@/server/db', () => ({
  db: {},
}))

import { appRouter } from '@/server/api/root'

vi.mock('@/lib/portfolio', () => ({
  createPortfolioSnapshot: vi.fn().mockResolvedValue(null),
}))

const testTelegramId = BigInt(424242)

function createMockDb() {
  return {
    user: {
      upsert: vi.fn().mockResolvedValue({
        id: 'user-1',
        telegramUserId: testTelegramId,
      }),
      update: vi.fn().mockResolvedValue({}),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue({ dailyDigestEnabled: false }),
    },
    priceSnapshot: {
      findFirst: vi.fn(),
    },
    userAsset: {
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    portfolio: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    portfolioSnapshot: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
    },
    alert: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaClient
}

function createCaller(
  db: PrismaClient,
  telegramUserId: bigint | null = testTelegramId,
) {
  return appRouter.createCaller({ db, telegramUserId })
}

describe('appRouter — prices', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
  })

  it('latest returns null payload when no snapshot exists', async () => {
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue(null)
    const caller = createCaller(db)

    const result = await caller.prices.latest()

    expect(result).toEqual({
      data: null,
      stale: true,
      snapshotAt: null,
    })
  })

  it('latest returns snapshot data and staleness flag', async () => {
    const snapshotAt = new Date('2026-01-01T12:00:00Z')
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt,
      data: { data: [] },
    } as never)
    const caller = createCaller(db)

    const result = await caller.prices.latest()

    expect(result.data).toEqual({ data: [] })
    expect(result.snapshotAt).toEqual(snapshotAt)
    expect(typeof result.stale).toBe('boolean')
  })
})

describe('appRouter — auth', () => {
  it('protected procedures reject unauthenticated callers', async () => {
    const db = createMockDb()
    const caller = createCaller(db, null)

    await expect(caller.user.getSettings()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    })
  })
})

describe('appRouter — user', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
  })

  it('getSettings returns digest flag', async () => {
    vi.mocked(db.user.findUniqueOrThrow).mockResolvedValue({
      dailyDigestEnabled: true,
    } as never)
    const caller = createCaller(db)

    const result = await caller.user.getSettings()

    expect(result).toEqual({ dailyDigestEnabled: true })
  })

  it('setPreferredLocale updates user', async () => {
    const caller = createCaller(db)

    await caller.user.setPreferredLocale({ locale: 'fa' })

    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { preferredLocale: 'fa' },
    })
  })
})

describe('appRouter — assets', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt: new Date(),
      data: { data: [] },
    } as never)
  })

  it('list returns empty totals when user has no assets', async () => {
    vi.mocked(db.userAsset.findMany).mockResolvedValue([])
    const caller = createCaller(db)

    const result = await caller.assets.list()

    expect(result.assets).toEqual([])
    expect(result.totalIRT).toBe(0)
  })

  it('add throws NOT_FOUND when portfolio is missing', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue(null)
    const caller = createCaller(db)

    await expect(
      caller.assets.add({
        symbol: 'USD',
        quantity: '1',
        portfolioId: 'pf-1',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('add throws FORBIDDEN when portfolio belongs to another user', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'pf-1',
      userId: 'other-user',
    } as never)
    const caller = createCaller(db)

    await expect(
      caller.assets.add({
        symbol: 'USD',
        quantity: '1',
        portfolioId: 'pf-1',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('add upserts asset when portfolio is owned', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'pf-1',
      userId: 'user-1',
    } as never)
    vi.mocked(db.userAsset.upsert).mockResolvedValue({
      id: 'asset-1',
      symbol: 'USD',
      quantity: '2',
      portfolioId: 'pf-1',
    } as never)
    const caller = createCaller(db)

    const result = await caller.assets.add({
      symbol: 'USD',
      quantity: '2',
      portfolioId: 'pf-1',
    })

    expect(result.symbol).toBe('USD')
    expect(db.userAsset.upsert).toHaveBeenCalled()
  })
})

describe('appRouter — alerts', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
  })

  it('list delegates to findMany', async () => {
    const rows = [{ id: 'a1' }] as never[]
    vi.mocked(db.alert.findMany).mockResolvedValue(rows)
    const caller = createCaller(db)

    const result = await caller.alerts.list()

    expect(result).toBe(rows)
    expect(db.alert.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('create rejects PRICE alerts without symbol', async () => {
    const caller = createCaller(db)

    await expect(
      caller.alerts.create({
        type: 'PRICE',
        direction: 'ABOVE',
        thresholdIRT: '1000',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})

describe('appRouter — portfolio', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
  })

  it('list maps asset counts', async () => {
    vi.mocked(db.portfolio.findMany).mockResolvedValue([
      {
        id: 'p1',
        name: 'Main',
        emoji: '💰',
        createdAt: new Date(),
        _count: { assets: 3 },
      },
    ] as never)
    const caller = createCaller(db)

    const result = await caller.portfolio.list()

    expect(result).toEqual([
      {
        id: 'p1',
        name: 'Main',
        emoji: '💰',
        createdAt: expect.any(Date) as Date,
        assetCount: 3,
      },
    ])
  })

  it('delete rejects when user has only one portfolio', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'p1',
      userId: 'user-1',
    } as never)
    vi.mocked(db.portfolio.count).mockResolvedValue(1)
    const caller = createCaller(db)

    await expect(caller.portfolio.delete({ id: 'p1' })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    })
  })

  it('history returns numeric totals for snapshots', async () => {
    const day = new Date('2026-02-01T00:00:00Z')
    vi.mocked(db.portfolioSnapshot.findMany).mockResolvedValue([
      { snapshotAt: day, totalIRT: '1500000' },
    ] as never)
    const caller = createCaller(db)

    const result = await caller.portfolio.history({ days: 7 })

    expect(result).toEqual([{ date: day, totalIRT: 1_500_000 }])
    expect(db.portfolioSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          portfolioId: null,
          snapshotAt: { gte: expect.any(Date) as Date },
        }),
      }),
    )
  })
})
