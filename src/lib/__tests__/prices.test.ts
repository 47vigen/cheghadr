import { describe, expect, it } from 'vitest'

import type { PriceItem } from '@/lib/prices'
import {
  computeConversion,
  filterPriceItems,
  findBySymbol,
  formatChange,
  formatIRT,
  getBaseSymbol,
  getSellPriceBySymbol,
  getSnapshotStaleness,
  groupByCategory,
  parsePriceSnapshot,
} from '@/lib/prices'

const makeItem = (
  symbol: string,
  faSell: string,
  category = 'CURRENCY',
  change?: string,
): PriceItem =>
  ({
    symbol: `${symbol}-IRT`,
    price_source: { symbol: 'GHEYMAT' },
    name: {
      symbol,
      category: { symbol: category },
      fa: `فارسی ${symbol}`,
      en: `English ${symbol}`,
    },
    base_currency: {
      symbol,
      category: { symbol: category },
      fa: `فارسی ${symbol}`,
      en: `English ${symbol}`,
    },
    quote_currency: {
      symbol: 'IRT',
      category: { symbol: 'CURRENCY' },
      fa: 'تومان',
      en: 'Toman',
    },
    sell_price: faSell,
    buy_price: faSell,
    is_tradable: true,
    created_at: new Date().toISOString(),
    is_up_to_date: true,
    ...(change !== undefined ? { change } : {}),
  }) as PriceItem

const USD = makeItem('USD', '500000', 'CURRENCY', '1.5')
const BTC = makeItem('BTC', '3000000000', 'CRYPTOCURRENCY', '-2.3')
const GOLD = makeItem('GOLD_18K', '10000000', 'GOLD')

describe('parsePriceSnapshot', () => {
  it('returns empty array for null/undefined/invalid', () => {
    expect(parsePriceSnapshot(null)).toEqual([])
    expect(parsePriceSnapshot(undefined)).toEqual([])
    expect(parsePriceSnapshot('string')).toEqual([])
    expect(parsePriceSnapshot(42)).toEqual([])
    expect(parsePriceSnapshot({})).toEqual([])
  })

  it('returns data array when valid', () => {
    const result = parsePriceSnapshot({ data: [USD, BTC] })
    expect(result).toHaveLength(2)
    expect(result[0]?.base_currency.symbol).toBe('USD')
  })
})

describe('getBaseSymbol', () => {
  it('uses base_currency.symbol when present', () => {
    expect(getBaseSymbol(USD)).toBe('USD')
  })

  it('derives from pair symbol when base_currency is missing', () => {
    const partial = {
      symbol: 'ETH-IRT',
      sell_price: '1',
    } as PriceItem
    expect(getBaseSymbol(partial)).toBe('ETH')
  })
})

describe('findBySymbol', () => {
  const items = [USD, BTC, GOLD]

  it('finds existing symbol', () => {
    expect(findBySymbol(items, 'BTC')?.base_currency.symbol).toBe('BTC')
  })

  it('finds by pair-derived base when base_currency is missing', () => {
    const partial = {
      ...USD,
      base_currency: undefined,
    } as unknown as PriceItem
    expect(findBySymbol([partial], 'USD')).toBe(partial)
  })

  it('returns undefined for missing symbol', () => {
    expect(findBySymbol(items, 'ETH')).toBeUndefined()
  })

  it('is case-sensitive', () => {
    expect(findBySymbol(items, 'usd')).toBeUndefined()
  })
})

describe('groupByCategory', () => {
  const items = [USD, BTC, GOLD]

  it('groups by category symbol', () => {
    const grouped = groupByCategory(items)
    expect(grouped.get('CURRENCY')).toHaveLength(1)
    expect(grouped.get('CRYPTOCURRENCY')).toHaveLength(1)
    expect(grouped.get('GOLD')).toHaveLength(1)
  })

  it('uses OTHER for missing category', () => {
    const noCategory = {
      ...USD,
      base_currency: { ...USD.base_currency, category: {} },
    } as PriceItem
    const grouped = groupByCategory([noCategory])
    expect(grouped.get('OTHER')).toHaveLength(1)
  })
})

describe('formatIRT', () => {
  it('formats large numbers with Persian digits', () => {
    const result = formatIRT(1234567)
    expect(result).toMatch(/[۰-۹]/)
  })

  it('rounds to nearest integer', () => {
    const a = formatIRT(1234.7)
    const b = formatIRT(1235)
    expect(a).toBe(b)
  })

  it('handles zero', () => {
    expect(formatIRT(0)).toBeTruthy()
  })
})

describe('formatChange', () => {
  it('returns null for null/undefined/empty', () => {
    expect(formatChange(null)).toBeNull()
    expect(formatChange(undefined)).toBeNull()
    expect(formatChange('')).toBeNull()
    expect(formatChange('abc')).toBeNull()
  })

  it('marks positive values', () => {
    const result = formatChange('1.5')
    expect(result?.positive).toBe(true)
    expect(result?.text).toContain('%')
  })

  it('marks negative values', () => {
    const result = formatChange('-2.3')
    expect(result?.positive).toBe(false)
  })

  it('treats zero as positive', () => {
    expect(formatChange('0')?.positive).toBe(true)
  })
})

describe('computeConversion', () => {
  const items = [USD, BTC, GOLD]

  it('converts USD to IRT correctly', () => {
    // 10 USD × 500000 IRT/USD / 1 = 5000000
    const result = computeConversion('10', 'USD', 'IRT', items)
    expect(result).toBe('5000000.0000')
  })

  it('converts IRT to USD correctly', () => {
    // 500000 IRT × 1 / 500000 = 1.0000
    const result = computeConversion('500000', 'IRT', 'USD', items)
    expect(result).toBe('1.0000')
  })

  it('converts between two assets', () => {
    // 1 BTC = 3000000000 IRT / 500000 = 6000 USD
    const result = computeConversion('1', 'BTC', 'USD', items)
    expect(result).toBe('6000.0000')
  })

  it('returns null for zero/negative amount', () => {
    expect(computeConversion('0', 'USD', 'IRT', items)).toBeNull()
    expect(computeConversion('-5', 'USD', 'IRT', items)).toBeNull()
  })

  it('returns null for unknown symbol', () => {
    expect(computeConversion('10', 'ETH', 'IRT', items)).toBeNull()
  })

  it('returns null for empty amount', () => {
    expect(computeConversion('', 'USD', 'IRT', items)).toBeNull()
  })

  it('returns null for NaN sell_price', () => {
    const badItem = makeItem('BAD', 'not-a-number', 'CURRENCY')
    expect(computeConversion('10', 'BAD', 'IRT', [badItem])).toBeNull()
  })

  it('handles IRT-to-IRT conversion (result = amount)', () => {
    const result = computeConversion('42', 'IRT', 'IRT', items)
    expect(result).toBe('42.0000')
  })
})

describe('getSellPriceBySymbol', () => {
  const items = [USD, BTC]

  it('returns 1 for IRT', () => {
    expect(getSellPriceBySymbol('IRT', items)).toBe(1)
  })

  it('returns parsed sell price for known symbol', () => {
    expect(getSellPriceBySymbol('USD', items)).toBe(500000)
  })

  it('returns 0 for unknown symbol', () => {
    expect(getSellPriceBySymbol('ETH', items)).toBe(0)
  })
})

describe('getSnapshotStaleness', () => {
  it('marks missing snapshot as stale', () => {
    expect(getSnapshotStaleness(null).stale).toBe(true)
  })

  it('marks old snapshots as stale', () => {
    const snapshotAt = new Date(Date.now() - 61 * 60 * 1000)
    expect(getSnapshotStaleness(snapshotAt).stale).toBe(true)
  })

  it('marks recent snapshots as fresh', () => {
    const snapshotAt = new Date(Date.now() - 10 * 60 * 1000)
    expect(getSnapshotStaleness(snapshotAt).stale).toBe(false)
  })
})

describe('filterPriceItems', () => {
  const items = [USD, BTC, GOLD]

  it('returns all items for empty query', () => {
    expect(filterPriceItems(items, '')).toHaveLength(3)
    expect(filterPriceItems(items, '   ')).toHaveLength(3)
  })

  it('filters by Persian name', () => {
    const result = filterPriceItems(items, 'فارسی USD')
    expect(result).toHaveLength(1)
    expect(result[0]?.base_currency.symbol).toBe('USD')
  })

  it('filters by English symbol case-insensitive', () => {
    const result = filterPriceItems(items, 'btc')
    expect(result).toHaveLength(1)
    expect(result[0]?.base_currency.symbol).toBe('BTC')
  })

  it('does not throw when name/base_currency fields are missing', () => {
    const broken = {
      symbol: 'X-IRT',
      name: undefined,
      base_currency: { symbol: 'X', fa: 'x', en: 'x', category: {} },
    } as unknown as PriceItem
    expect(() => filterPriceItems([broken], 'nope')).not.toThrow()
    expect(filterPriceItems([broken], 'x')).toHaveLength(1)
  })
})
