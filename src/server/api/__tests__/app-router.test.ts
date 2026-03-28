import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/server/auth/config', () => ({
  auth: vi.fn(async () => null),
}))

vi.mock('@/server/db', () => ({
  db: {},
}))

import { appRouter } from '@/server/api/root'
import { invalidatePriceCache } from '@/server/price-cache'

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
      findFirst: vi.fn(),
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

// Clear the module-level price cache before every test so no state bleeds across tests.
beforeEach(() => {
  invalidatePriceCache()
})

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

describe('appRouter — portfolio ensureDefault', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
  })

  it('returns first portfolio id when one exists', async () => {
    vi.mocked(db.portfolio.findFirst).mockResolvedValue({
      id: 'pf-existing',
    } as never)
    const caller = createCaller(db)

    const result = await caller.portfolio.ensureDefault()

    expect(result).toEqual({ id: 'pf-existing' })
    expect(db.portfolio.create).not.toHaveBeenCalled()
  })

  it('creates default portfolio when none exist', async () => {
    vi.mocked(db.portfolio.findFirst).mockResolvedValue(null)
    vi.mocked(db.portfolio.create).mockResolvedValue({ id: 'pf-new' } as never)
    const caller = createCaller(db)

    const result = await caller.portfolio.ensureDefault()

    expect(result).toEqual({ id: 'pf-new' })
    expect(db.portfolio.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        name: 'Main portfolio',
      },
      select: { id: true },
    })
  })

  it('add asset succeeds with portfolio id from ensureDefault', async () => {
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt: new Date(),
      data: { data: [] },
    } as never)
    vi.mocked(db.portfolio.findFirst).mockResolvedValue(null)
    vi.mocked(db.portfolio.create).mockResolvedValue({ id: 'pf-new' } as never)
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'pf-new',
      userId: 'user-1',
    } as never)
    vi.mocked(db.userAsset.upsert).mockResolvedValue({
      id: 'asset-1',
      symbol: 'USD',
      quantity: '1',
      portfolioId: 'pf-new',
    } as never)
    const caller = createCaller(db)

    const { id } = await caller.portfolio.ensureDefault()
    const added = await caller.assets.add({
      symbol: 'USD',
      quantity: '1',
      portfolioId: id,
    })

    expect(added.symbol).toBe('USD')
    expect(db.userAsset.upsert).toHaveBeenCalled()
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

  it('create accepts PRICE alert with symbol', async () => {
    vi.mocked(db.alert.count).mockResolvedValue(0)
    vi.mocked(db.alert.create).mockResolvedValue({ id: 'alert-new' } as never)
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt: new Date(),
      data: {
        data: [{ base_currency: { symbol: 'USD' }, quote_currency: { symbol: 'IRT' }, sell_price: '500000' }],
      },
    } as never)
    const caller = createCaller(db)

    const result = await caller.alerts.create({
      type: 'PRICE',
      symbol: 'USD',
      direction: 'ABOVE',
      thresholdIRT: '1500000',
    })

    expect(result).toMatchObject({ id: 'alert-new' })
  })

  it('create accepts PORTFOLIO alert without symbol', async () => {
    vi.mocked(db.alert.count).mockResolvedValue(0)
    vi.mocked(db.alert.create).mockResolvedValue({
      id: 'alert-portfolio',
    } as never)
    const caller = createCaller(db)

    const result = await caller.alerts.create({
      type: 'PORTFOLIO',
      direction: 'BELOW',
      thresholdIRT: '10000000',
    })

    expect(result).toMatchObject({ id: 'alert-portfolio' })
  })

  it('delete removes the alert owned by the caller', async () => {
    vi.mocked(db.alert.findUnique).mockResolvedValue({
      id: 'a1',
      userId: 'user-1',
    } as never)
    vi.mocked(db.alert.delete).mockResolvedValue({ id: 'a1' } as never)
    const caller = createCaller(db)

    await caller.alerts.delete({ id: 'a1' })

    expect(db.alert.delete).toHaveBeenCalledWith({ where: { id: 'a1' } })
  })

  it('delete throws FORBIDDEN when alert belongs to another user', async () => {
    vi.mocked(db.alert.findUnique).mockResolvedValue({
      id: 'a1',
      userId: 'other-user',
    } as never)
    const caller = createCaller(db)

    await expect(caller.alerts.delete({ id: 'a1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('delete throws NOT_FOUND when alert does not exist', async () => {
    vi.mocked(db.alert.findUnique).mockResolvedValue(null)
    const caller = createCaller(db)

    await expect(caller.alerts.delete({ id: 'missing' })).rejects.toMatchObject(
      {
        code: 'NOT_FOUND',
      },
    )
  })
})

describe('appRouter — assets (extended)', () => {
  let db: PrismaClient

  beforeEach(() => {
    db = createMockDb()
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt: new Date(),
      data: { data: [] },
    } as never)
  })

  it('add upserts with decimal quantity', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'pf-1',
      userId: 'user-1',
    } as never)
    vi.mocked(db.userAsset.upsert).mockResolvedValue({
      id: 'asset-btc',
      symbol: 'BTC',
      quantity: '0.00123',
      portfolioId: 'pf-1',
    } as never)
    const caller = createCaller(db)

    const result = await caller.assets.add({
      symbol: 'BTC',
      quantity: '0.00123',
      portfolioId: 'pf-1',
    })

    expect(result.symbol).toBe('BTC')
    expect(result.quantity).toBe('0.00123')
  })

  it('list returns aggregated assets across portfolio', async () => {
    vi.mocked(db.userAsset.findMany).mockResolvedValue([
      { id: 'a1', symbol: 'USD', quantity: '10', portfolioId: 'pf-1' },
      { id: 'a2', symbol: 'BTC', quantity: '0.5', portfolioId: 'pf-1' },
    ] as never)
    const caller = createCaller(db)

    const result = await caller.assets.list()

    expect(result.assets).toHaveLength(2)
  })

  it('list throws FORBIDDEN when portfolioId belongs to another user', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'pf-other',
      userId: 'other-user',
    } as never)
    const caller = createCaller(db)

    await expect(
      caller.assets.list({ portfolioId: 'pf-other' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
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

  it('history returns daily series with forward-filled totals', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))

    vi.mocked(db.portfolioSnapshot.findFirst)
      .mockResolvedValueOnce({
        snapshotAt: new Date('2026-03-01T00:00:00Z'),
      } as never)
      .mockResolvedValueOnce({ totalIRT: '1000000' } as never)

    vi.mocked(db.portfolioSnapshot.findMany).mockResolvedValue([
      { snapshotAt: new Date('2026-03-22T10:00:00Z'), totalIRT: '1500000' },
    ] as never)

    const caller = createCaller(db)

    const result = await caller.portfolio.history({ window: '1W' })

    expect(result).toHaveLength(7)
    expect(result[0]?.totalIRT).toBe(1_000_000)
    expect(result[1]?.totalIRT).toBe(1_000_000)
    expect(result[2]?.totalIRT).toBe(1_000_000)
    expect(result[3]?.totalIRT).toBe(1_500_000)
    expect(result[4]?.totalIRT).toBe(1_500_000)
    expect(result[6]?.totalIRT).toBe(1_500_000)

    expect(db.portfolioSnapshot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          portfolioId: null,
          snapshotAt: {
            gte: expect.any(Date) as Date,
            lt: expect.any(Date) as Date,
          },
        }),
      }),
    )

    vi.useRealTimers()
  })

  it('history returns empty array when no snapshots exist in range and no carry', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))

    vi.mocked(db.portfolioSnapshot.findFirst)
      .mockResolvedValueOnce({
        snapshotAt: new Date('2026-03-01T00:00:00Z'),
      } as never)
      .mockResolvedValueOnce(null)

    vi.mocked(db.portfolioSnapshot.findMany).mockResolvedValue([])

    const caller = createCaller(db)

    const result = await caller.portfolio.history({ window: '1M' })

    expect(result).toEqual([])

    vi.useRealTimers()
  })

  it('biggestMover returns null when user has no assets', async () => {
    vi.mocked(db.userAsset.findMany).mockResolvedValue([])
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue({
      snapshotAt: new Date(),
      data: { data: [] },
    } as never)
    const caller = createCaller(db)

    const result = await caller.portfolio.biggestMover({
      window: '1D',
      timezone: 'UTC',
      locale: 'en',
    })

    expect(result).toBeNull()
  })

  it('delete succeeds when user has more than one portfolio', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'p2',
      userId: 'user-1',
    } as never)
    vi.mocked(db.portfolio.count).mockResolvedValue(2)
    vi.mocked(db.portfolio.delete).mockResolvedValue({ id: 'p2' } as never)
    const caller = createCaller(db)

    await expect(caller.portfolio.delete({ id: 'p2' })).resolves.not.toThrow()
    expect(db.portfolio.delete).toHaveBeenCalledWith({ where: { id: 'p2' } })
  })

  it('delete throws FORBIDDEN when portfolio belongs to another user', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue({
      id: 'p1',
      userId: 'other-user',
    } as never)
    const caller = createCaller(db)

    await expect(caller.portfolio.delete({ id: 'p1' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })

  it('delete throws NOT_FOUND when portfolio does not exist', async () => {
    vi.mocked(db.portfolio.findUnique).mockResolvedValue(null)
    const caller = createCaller(db)

    await expect(
      caller.portfolio.delete({ id: 'missing' }),
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })
})
