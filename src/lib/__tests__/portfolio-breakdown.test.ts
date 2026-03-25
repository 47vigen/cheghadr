import { describe, expect, it } from 'vitest'

import { computeLivePortfolioBreakdown } from '@/lib/portfolio-breakdown'
import type { PriceItem } from '@/lib/prices'

const usdPrice = (sell: string): PriceItem =>
  ({
    base_currency: {
      symbol: 'USD',
      category: { symbol: 'CURRENCY' },
    },
    sell_price: sell,
  }) as PriceItem

describe('computeLivePortfolioBreakdown', () => {
  it('returns null when total value is zero', () => {
    const result = computeLivePortfolioBreakdown(
      [{ symbol: 'USD', quantity: '0' }],
      [usdPrice('500000')],
    )
    expect(result).toBeNull()
  })

  it('aggregates by category and percentages from live prices', () => {
    const prices: PriceItem[] = [
      usdPrice('500000'),
      {
        base_currency: {
          symbol: 'BTC',
          category: { symbol: 'CRYPTOCURRENCY' },
        },
        sell_price: '2000000000',
      } as PriceItem,
    ]

    const result = computeLivePortfolioBreakdown(
      [
        { symbol: 'USD', quantity: '2' },
        { symbol: 'BTC', quantity: '0.001' },
      ],
      prices,
    )

    expect(result).not.toBeNull()
    if (!result) return

    expect(result.totalIRT).toBe(2 * 500_000 + 0.001 * 2_000_000_000)

    const currency = result.categories.find((c) => c.category === 'CURRENCY')
    const crypto = result.categories.find(
      (c) => c.category === 'CRYPTOCURRENCY',
    )
    expect(currency?.valueIRT).toBe(2 * 500_000)
    expect(crypto?.valueIRT).toBe(0.001 * 2_000_000_000)

    const sumPct = result.categories.reduce((s, c) => s + c.percentage, 0)
    expect(sumPct).toBeCloseTo(100, 5)
  })
})
