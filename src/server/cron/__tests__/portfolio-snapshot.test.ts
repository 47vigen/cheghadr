import type { PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/portfolio', () => ({
  createPortfolioSnapshot: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/telegram-bot', () => ({
  sendBotMessageWithRetry: vi.fn().mockResolvedValue({ success: true, messageId: 1 }),
}))

import { createPortfolioSnapshot } from '@/lib/portfolio'
import { runPortfolioCron } from '@/server/cron/portfolio-snapshot'

function createMockDb() {
  return {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    portfolio: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    alert: {
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    portfolioSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    priceSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
    },
  } as unknown as PrismaClient
}

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token-123'
  vi.useFakeTimers()
})

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('runPortfolioCron', () => {
  it('returns zero counts when there are no active users', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([])

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.portfolioSnapshotCount).toBe(0)
    expect(result.portfolioAlertsTriggered).toBe(0)
    expect(result.digestsSent).toBe(0)
  })

  it('creates snapshots for each portfolio per user', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user-1',
        telegramUserId: BigInt(111),
        dailyDigestEnabled: false,
        preferredLocale: 'fa',
      },
    ] as never)
    vi.mocked(db.portfolio.findMany).mockResolvedValue([
      { id: 'pf-1' },
      { id: 'pf-2' },
    ] as never)
    // Per-portfolio snapshots: 2 portfolios + 1 aggregate (portfolioId: null)
    vi.mocked(createPortfolioSnapshot)
      .mockResolvedValueOnce({ id: 's1' } as never) // pf-1
      .mockResolvedValueOnce({ id: 's2' } as never) // pf-2
      .mockResolvedValueOnce({ id: 's3' } as never) // aggregate

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.portfolioSnapshotCount).toBe(3)
    expect(createPortfolioSnapshot).toHaveBeenCalledTimes(3)
  })

  it('skips snapshot count for portfolios where createPortfolioSnapshot returns null', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user-1',
        telegramUserId: BigInt(111),
        dailyDigestEnabled: false,
        preferredLocale: 'fa',
      },
    ] as never)
    vi.mocked(db.portfolio.findMany).mockResolvedValue([{ id: 'pf-1' }] as never)

    // null means "recent snapshot already exists, skipped"
    vi.mocked(createPortfolioSnapshot).mockResolvedValue(null)

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.portfolioSnapshotCount).toBe(0)
  })

  it('does not fire portfolio alert when snapshot data is missing', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([])
    vi.mocked(db.alert.findMany).mockResolvedValue([
      {
        id: 'alert-1',
        userId: 'user-1',
        type: 'PORTFOLIO',
        direction: 'ABOVE',
        thresholdIRT: { toString: () => '5000000' },
        isActive: true,
        user: {
          telegramUserId: BigInt(999),
          id: 'user-1',
          preferredLocale: 'fa',
        },
      },
    ] as never)
    // No snapshots available
    vi.mocked(db.portfolioSnapshot.findFirst).mockResolvedValue(null)

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.portfolioAlertsTriggered).toBe(0)
    expect(db.alert.updateMany).not.toHaveBeenCalled()
  })

  it('prunes old portfolio snapshots and returns pruned count', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([])
    vi.mocked(db.portfolioSnapshot.deleteMany).mockResolvedValue({ count: 7 } as never)

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.prunedPortfolio).toBe(7)
    expect(db.portfolioSnapshot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { snapshotAt: { lt: expect.any(Date) as Date } },
      }),
    )
  })

  it('does not send digest message when snapshot data is missing', async () => {
    const db = createMockDb()
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: 'user-digest',
        telegramUserId: BigInt(222),
        dailyDigestEnabled: true,
        preferredLocale: 'en',
      },
    ] as never)
    vi.mocked(db.portfolio.findMany).mockResolvedValue([])
    vi.mocked(db.alert.findMany).mockResolvedValue([])
    // No snapshots — digest message should not be sent
    vi.mocked(db.portfolioSnapshot.findFirst).mockResolvedValue(null)

    const { sendBotMessageWithRetry } = await import('@/lib/telegram-bot')

    const runPromise = runPortfolioCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    // digestsSent counts users with digest enabled (not actual sends)
    expect(result.digestsSent).toBe(1)
    // No message is actually sent when snapshots are missing
    expect(result.messageSent).toBe(0)
    expect(sendBotMessageWithRetry).not.toHaveBeenCalled()
  })
})
