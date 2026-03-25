import { describe, expect, it, vi } from 'vitest'

import {
  buildDailyPortfolioHistorySeries,
  getPortfolioHistoryRange,
} from '@/lib/portfolio-history'

const TZ = 'UTC'

describe('getPortfolioHistoryRange', () => {
  it('returns 7 inclusive days for 1D and 1W from a fixed "today"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T15:00:00Z'))

    const r1 = getPortfolioHistoryRange('1D', new Date('2026-01-01'), TZ)
    const r2 = getPortfolioHistoryRange('1W', new Date('2026-01-01'), TZ)
    expect(r1).toEqual(r2)
    expect(r1?.rangeStart.toISOString()).toBe('2026-03-19T00:00:00.000Z')
    expect(r1?.rangeEnd.toISOString()).toBe('2026-03-25T00:00:00.000Z')

    vi.useRealTimers()
  })

  it('returns 30 inclusive UTC days for 1M', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))

    const r = getPortfolioHistoryRange('1M', null, TZ)
    expect(r?.rangeStart.toISOString()).toBe('2026-02-24T00:00:00.000Z')
    expect(r?.rangeEnd.toISOString()).toBe('2026-03-25T00:00:00.000Z')

    vi.useRealTimers()
  })

  it('returns null for ALL when there is no first snapshot', () => {
    expect(getPortfolioHistoryRange('ALL', null, TZ)).toBeNull()
  })

  it('ALL spans from first snapshot day through today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))

    const r = getPortfolioHistoryRange(
      'ALL',
      new Date('2026-03-20T08:30:00Z'),
      TZ,
    )
    expect(r?.rangeStart.toISOString()).toBe('2026-03-20T00:00:00.000Z')
    expect(r?.rangeEnd.toISOString()).toBe('2026-03-25T00:00:00.000Z')

    vi.useRealTimers()
  })
})

describe('buildDailyPortfolioHistorySeries', () => {
  it('forward-fills missing days from previous snapshot value', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-25T12:00:00Z'))

    const rangeStart = new Date('2026-03-23T00:00:00.000Z')
    const rangeEnd = new Date('2026-03-25T00:00:00.000Z')

    const series = buildDailyPortfolioHistorySeries(
      rangeStart,
      rangeEnd,
      [
        {
          snapshotAt: new Date('2026-03-24T10:00:00Z'),
          totalIRT: 2_000_000,
        },
      ],
      1_000_000,
      TZ,
    )

    expect(series).toHaveLength(3)
    expect(series[0]?.totalIRT).toBe(1_000_000)
    expect(series[1]?.totalIRT).toBe(2_000_000)
    expect(series[2]?.totalIRT).toBe(2_000_000)
    expect(series[0]?.date.toISOString()).toBe('2026-03-23T12:00:00.000Z')

    vi.useRealTimers()
  })
})
