import type { PrismaClient } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { evaluatePriceAlerts } from '@/lib/alerts/evaluation'

function createDbMock() {
  const db = {
    alert: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  }
  return db as unknown as PrismaClient & {
    alert: {
      findMany: ReturnType<typeof vi.fn>
      updateMany: ReturnType<typeof vi.fn>
    }
  }
}

function makeSnapshot(sellPrice: string) {
  return {
    id: 'snap-1',
    snapshotAt: new Date(),
    data: {
      data: [
        {
          base_currency: {
            symbol: 'USD',
            category: null,
            png: null,
            fa: 'دلار',
            en: 'USD',
          },
          quote_currency: { symbol: 'IRT' },
          name: { fa: 'دلار', en: 'US Dollar' },
          sell_price: sellPrice,
          change: '0',
          png: null,
        },
      ],
    },
  }
}

function makeAlert(
  direction: 'ABOVE' | 'BELOW',
  threshold: string,
  overrides = {},
) {
  return {
    id: 'alert-1',
    userId: 'user-1',
    type: 'PRICE' as const,
    symbol: 'USD',
    direction,
    thresholdIRT: { toString: () => threshold },
    isActive: true,
    triggeredAt: null,
    createdAt: new Date(),
    user: {
      telegramUserId: BigInt(123456789),
      preferredLocale: 'fa' as const,
    },
    ...overrides,
  }
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

describe('evaluatePriceAlerts', () => {
  it('returns zero counts when previousSnapshot is null', async () => {
    const db = createDbMock()
    const result = await evaluatePriceAlerts(db, makeSnapshot('500000'), null)
    expect(result).toEqual({ evaluated: 0, triggered: 0 })
    expect(db.alert.findMany).not.toHaveBeenCalled()
  })

  it('returns zero counts when there are no active alerts', async () => {
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([])

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'),
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result).toEqual({ evaluated: 0, triggered: 0 })
  })

  it('fires ABOVE alert when price crosses above threshold', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('ABOVE', '1500000')])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'), // current > threshold
      makeSnapshot('1400000'), // previous < threshold
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(1)
    expect(db.alert.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['alert-1'] } },
      data: { isActive: false, triggeredAt: expect.any(Date) },
    })
  })

  it('fires BELOW alert when price crosses below threshold', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('BELOW', '1500000')])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1400000'), // current < threshold
      makeSnapshot('1600000'), // previous > threshold
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(1)
  })

  it('does NOT fire ABOVE alert when price stays above threshold', async () => {
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('ABOVE', '1500000')])

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1700000'), // current > threshold
      makeSnapshot('1600000'), // previous also > threshold (no crossing)
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(0)
    expect(db.alert.updateMany).not.toHaveBeenCalled()
  })

  it('does NOT fire BELOW alert when price stays below threshold', async () => {
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('BELOW', '1500000')])

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1300000'), // current < threshold
      makeSnapshot('1400000'), // previous also < threshold (no crossing)
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(0)
    expect(db.alert.updateMany).not.toHaveBeenCalled()
  })

  it('evaluates multiple alerts and triggers correct ones', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([
      makeAlert('ABOVE', '1500000', { id: 'a1' }), // should trigger
      makeAlert('ABOVE', '1800000', { id: 'a2' }), // should NOT trigger (price < threshold)
    ])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'), // crosses 1500000 but not 1800000
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(1)
    expect(db.alert.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1'] } },
      data: { isActive: false, triggeredAt: expect.any(Date) },
    })
  })

  it('does not deactivate alert when Telegram send fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, description: 'User blocked bot' }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('ABOVE', '1500000')])
    db.alert.updateMany.mockResolvedValue({ count: 0 })

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'),
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    await drainPromise

    expect(db.alert.updateMany).not.toHaveBeenCalled()
  })

  it('fires ABOVE alert when price is exactly at threshold (>= boundary)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('ABOVE', '1500000')])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    // previous < threshold, current === threshold → fires (>= condition)
    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1500000'), // exactly at threshold
      makeSnapshot('1400000'), // previous below
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(1)
  })

  it('fires BELOW alert when price is exactly at threshold (<= boundary)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('BELOW', '1500000')])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    // previous > threshold, current === threshold → fires (<= condition)
    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1500000'), // exactly at threshold
      makeSnapshot('1600000'), // previous above
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(1)
  })

  it('skips alerts for symbols absent from the current snapshot', async () => {
    const db = createDbMock()
    // Alert is for 'BTC' but snapshot only has 'USD'
    db.alert.findMany.mockResolvedValue([
      makeAlert('ABOVE', '1500000', { symbol: 'BTC' }),
    ])

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'), // only has USD
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.evaluated).toBe(1)
    expect(result.triggered).toBe(0)
    expect(db.alert.updateMany).not.toHaveBeenCalled()
  })

  it('skips alerts when sell price is zero or non-finite', async () => {
    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([makeAlert('ABOVE', '1500000')])

    const badSnapshot = {
      id: 'snap-bad',
      snapshotAt: new Date(),
      data: {
        data: [
          {
            base_currency: {
              symbol: 'USD',
              category: null,
              png: null,
              fa: 'دلار',
              en: 'USD',
            },
            quote_currency: { symbol: 'IRT' },
            name: { fa: 'دلار', en: 'US Dollar' },
            sell_price: '0', // zero price
            change: '0',
            png: null,
          },
        ],
      },
    }

    const drainPromise = evaluatePriceAlerts(
      db,
      badSnapshot,
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(0)
  })

  it('deactivates only successfully sent alerts when some fail', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        // first alert succeeds, second fails
        const ok = callCount === 1
        return Promise.resolve({
          ok: true,
          json: async () =>
            ok
              ? { ok: true, result: { message_id: callCount } }
              : { ok: false, description: 'User blocked bot' },
        })
      }),
    )

    const db = createDbMock()
    db.alert.findMany.mockResolvedValue([
      makeAlert('ABOVE', '1500000', { id: 'a1' }),
      makeAlert('ABOVE', '1500000', { id: 'a2', symbol: 'USD' }),
    ])
    db.alert.updateMany.mockResolvedValue({ count: 1 })

    const drainPromise = evaluatePriceAlerts(
      db,
      makeSnapshot('1600000'),
      makeSnapshot('1400000'),
    )
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.triggered).toBe(2)
    // Only 'a1' should be deactivated (send succeeded); 'a2' failed
    expect(db.alert.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a1'] } },
      data: { isActive: false, triggeredAt: expect.any(Date) },
    })
  })
})
