import { describe, expect, it } from 'vitest'

import { computeBiggestMover } from '@/lib/portfolio-utils'
import type { BilingualDisplayNames } from '@/lib/prices'

const makeAsset = (
  symbol: string,
  valueIRT: number,
  change: string | null,
  displayNames?: BilingualDisplayNames,
): {
  symbol: string
  displayNames: BilingualDisplayNames
  valueIRT: number
  change: string | null
} => ({
  symbol,
  displayNames: displayNames ?? {
    fa: `دارایی ${symbol}`,
    en: `Asset ${symbol}`,
  },
  valueIRT,
  change,
})

describe('computeBiggestMover', () => {
  it('returns null for empty array', () => {
    expect(computeBiggestMover([], 'en')).toBeNull()
  })

  it('returns null when all assets have null change', () => {
    const assets = [makeAsset('USD', 5_000_000, null)]
    expect(computeBiggestMover(assets, 'en')).toBeNull()
  })

  it('returns null when all changes are zero', () => {
    const assets = [makeAsset('USD', 5_000_000, '0')]
    expect(computeBiggestMover(assets, 'en')).toBeNull()
  })

  it('returns null when all deltas are below minimum threshold', () => {
    const assets = [makeAsset('USD', 100, '5')]
    expect(computeBiggestMover(assets, 'en')).toBeNull()
  })

  it('returns the single asset with positive change above threshold', () => {
    const assets = [makeAsset('GOLD', 10_000_000, '2.5')]
    const result = computeBiggestMover(assets, 'en')
    expect(result).not.toBeNull()
    expect(result?.symbol).toBe('GOLD')
    expect(result?.isPositive).toBe(true)
    expect(result?.changePct).toBe(2.5)
    expect(result?.assetName).toBe('Asset GOLD')
  })

  it('uses Persian label when locale is fa', () => {
    const assets = [
      makeAsset('GOLD', 10_000_000, '2.5', {
        fa: 'طلای ۱۸',
        en: '18K Gold',
      }),
    ]
    const result = computeBiggestMover(assets, 'fa')
    expect(result?.assetName).toBe('طلای ۱۸')
  })

  it('uses symbol when displayNames is missing', () => {
    const assets = [{ symbol: 'GOLD', valueIRT: 10_000_000, change: '2.5' }]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.assetName).toBe('GOLD')
  })

  it('returns the single asset with negative change above threshold', () => {
    const assets = [makeAsset('BTC', 10_000_000, '-3.0')]
    const result = computeBiggestMover(assets, 'en')
    expect(result).not.toBeNull()
    expect(result?.symbol).toBe('BTC')
    expect(result?.isPositive).toBe(false)
  })

  it('returns asset with highest absolute deltaIRT among multiple', () => {
    const assets = [
      makeAsset('USD', 1_000_000, '1.0'),
      makeAsset('GOLD', 10_000_000, '2.0'),
      makeAsset('BTC', 5_000_000, '0.5'),
    ]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.symbol).toBe('GOLD')
  })

  it('picks negative mover when its absolute delta is higher', () => {
    const assets = [
      makeAsset('USD', 5_000_000, '1.0'),
      makeAsset('BTC', 20_000_000, '-5.0'),
    ]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.symbol).toBe('BTC')
    expect(result?.isPositive).toBe(false)
  })

  it('skips assets with null change', () => {
    const assets = [
      makeAsset('USD', 100_000_000, null),
      makeAsset('GOLD', 5_000_000, '2.0'),
    ]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.symbol).toBe('GOLD')
  })

  it('skips assets with NaN change string', () => {
    const assets = [
      makeAsset('BAD', 100_000_000, 'not-a-number'),
      makeAsset('GOLD', 5_000_000, '2.0'),
    ]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.symbol).toBe('GOLD')
  })

  it('computes deltaIRT correctly for positive change', () => {
    const assets = [makeAsset('GOLD', 10_000_000, '10')]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.deltaIRT).toBeGreaterThan(900_000)
    expect(result?.deltaIRT).toBeLessThan(920_000)
  })

  it('computes deltaIRT correctly for negative change', () => {
    const assets = [makeAsset('BTC', 10_000_000, '-10')]
    const result = computeBiggestMover(assets, 'en')
    expect(result?.deltaIRT).toBeLessThan(-1_100_000)
    expect(result?.deltaIRT).toBeGreaterThan(-1_120_000)
  })
})
