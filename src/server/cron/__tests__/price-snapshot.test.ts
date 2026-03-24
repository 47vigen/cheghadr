import type { PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * price-snapshot.ts captures NEXT_PUBLIC_ECOTRUST_API_URL at module-load time.
 * We use vi.resetModules() + dynamic imports so each test can control the env var.
 */

vi.mock('@/lib/alerts/evaluation', () => ({
  evaluatePriceAlerts: vi
    .fn()
    .mockResolvedValue({ evaluated: 0, triggered: 0 }),
}))

function createMockDb() {
  return {
    priceSnapshot: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 'snap-new',
        snapshotAt: new Date(),
        data: {},
      }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  } as unknown as PrismaClient
}

function makeFetchResponse(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => data,
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetModules()
})

afterEach(() => {
  delete process.env.NEXT_PUBLIC_ECOTRUST_API_URL
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('getPriceCronConfigError', () => {
  it('returns null when URL is configured', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://example.com'
    const { getPriceCronConfigError } = await import(
      '@/server/cron/price-snapshot'
    )
    expect(getPriceCronConfigError()).toBeNull()
  })

  it('returns error message when URL is missing', async () => {
    delete process.env.NEXT_PUBLIC_ECOTRUST_API_URL
    const { getPriceCronConfigError } = await import(
      '@/server/cron/price-snapshot'
    )
    const err = getPriceCronConfigError()
    expect(err).toContain('NEXT_PUBLIC_ECOTRUST_API_URL')
  })
})

describe('runPriceSnapshotCron', () => {
  it('creates a snapshot and returns asset count', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )

    const fakeData = { data: [{ symbol: 'USD' }, { symbol: 'EUR' }] }
    vi.stubGlobal('fetch', makeFetchResponse(fakeData))

    const db = createMockDb()
    vi.mocked(db.priceSnapshot.create).mockResolvedValue({
      id: 'snap-1',
      snapshotAt: new Date(),
      data: fakeData,
    } as never)

    const runPromise = runPriceSnapshotCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.assetsCount).toBe(2)
    expect(db.priceSnapshot.create).toHaveBeenCalled()
  })

  it('passes previous snapshot to evaluatePriceAlerts', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )
    const { evaluatePriceAlerts } = await import('@/lib/alerts/evaluation')

    const previousSnap = { id: 'snap-prev', snapshotAt: new Date(), data: {} }
    const newSnap = {
      id: 'snap-new',
      snapshotAt: new Date(),
      data: { data: [{ symbol: 'USD' }] },
    }
    const fakeData = { data: [{ symbol: 'USD' }] }

    vi.stubGlobal('fetch', makeFetchResponse(fakeData))

    const db = createMockDb()
    vi.mocked(db.priceSnapshot.findFirst).mockResolvedValue(
      previousSnap as never,
    )
    vi.mocked(db.priceSnapshot.create).mockResolvedValue(newSnap as never)

    const runPromise = runPriceSnapshotCron(db)
    await vi.runAllTimersAsync()
    await runPromise

    expect(evaluatePriceAlerts).toHaveBeenCalledWith(db, newSnap, previousSnap)
  })

  it('reports alert evaluation results in return value', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )
    const { evaluatePriceAlerts } = await import('@/lib/alerts/evaluation')

    vi.mocked(evaluatePriceAlerts).mockResolvedValue({
      evaluated: 5,
      triggered: 2,
    })
    vi.stubGlobal('fetch', makeFetchResponse({ data: [{ symbol: 'USD' }] }))

    const db = createMockDb()
    const runPromise = runPriceSnapshotCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.alertsEvaluated).toBe(5)
    expect(result.alertsTriggered).toBe(2)
  })

  it('prunes old snapshots and returns pruned count', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )

    vi.stubGlobal('fetch', makeFetchResponse({ data: [{ symbol: 'USD' }] }))

    const db = createMockDb()
    vi.mocked(db.priceSnapshot.deleteMany).mockResolvedValue({
      count: 3,
    } as never)

    const runPromise = runPriceSnapshotCron(db)
    await vi.runAllTimersAsync()
    const result = await runPromise

    expect(result.prunedCount).toBe(3)
    expect(db.priceSnapshot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { snapshotAt: { lt: expect.any(Date) as Date } },
      }),
    )
  })

  it('throws when the API returns a non-ok response', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )

    vi.stubGlobal('fetch', makeFetchResponse({}, false))

    const db = createMockDb()
    // No need for runAllTimersAsync — function throws before any timers
    await expect(runPriceSnapshotCron(db)).rejects.toThrow(
      'Ecotrust API returned',
    )
  })

  it('throws when the API returns empty data array', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )

    vi.stubGlobal('fetch', makeFetchResponse({ data: [] }))

    const db = createMockDb()
    await expect(runPriceSnapshotCron(db)).rejects.toThrow('empty or invalid')
  })

  it('throws when the API returns no data field', async () => {
    process.env.NEXT_PUBLIC_ECOTRUST_API_URL = 'http://test-ecotrust'
    const { runPriceSnapshotCron } = await import(
      '@/server/cron/price-snapshot'
    )

    vi.stubGlobal('fetch', makeFetchResponse({ other: 'field' }))

    const db = createMockDb()
    await expect(runPriceSnapshotCron(db)).rejects.toThrow('empty or invalid')
  })
})
