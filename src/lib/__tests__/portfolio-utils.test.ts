import { describe, expect, it } from 'vitest'

import { computeBiggestMover } from '@/lib/portfolio-utils'

const makeAsset = (
  symbol: string,
  valueIRT: number,
  change: string | null,
) => ({
  symbol,
  assetName: `Asset ${symbol}`,
  valueIRT,
  change,
})

describe('computeBiggestMover', () => {
  it('returns null for empty array', () => {
    expect(computeBiggestMover([])).toBeNull()
  })

  it('returns null when all assets have null change', () => {
    const assets = [makeAsset('USD', 5_000_000, null)]
    expect(computeBiggestMover(assets)).toBeNull()
  })

  it('returns null when all changes are zero', () => {
    const assets = [makeAsset('USD', 5_000_000, '0')]
    expect(computeBiggestMover(assets)).toBeNull()
  })

  it('returns null when all deltas are below minimum threshold', () => {
    const assets = [makeAsset('USD', 100, '5')]
    expect(computeBiggestMover(assets)).toBeNull()
  })

  it('returns the single asset with positive change above threshold', () => {
    const assets = [makeAsset('GOLD', 10_000_000, '2.5')]
    const result = computeBiggestMover(assets)
    expect(result).not.toBeNull()
    expect(result?.symbol).toBe('GOLD')
    expect(result?.isPositive).toBe(true)
    expect(result?.changePct).toBe(2.5)
  })

  it('returns the single asset with negative change above threshold', () => {
    const assets = [makeAsset('BTC', 10_000_000, '-3.0')]
    const result = computeBiggestMover(assets)
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
    const result = computeBiggestMover(assets)
    expect(result?.symbol).toBe('GOLD')
  })

  it('picks negative mover when its absolute delta is higher', () => {
    const assets = [
      makeAsset('USD', 5_000_000, '1.0'),
      makeAsset('BTC', 20_000_000, '-5.0'),
    ]
    const result = computeBiggestMover(assets)
    expect(result?.symbol).toBe('BTC')
    expect(result?.isPositive).toBe(false)
  })

  it('skips assets with null change', () => {
    const assets = [
      makeAsset('USD', 100_000_000, null),
      makeAsset('GOLD', 5_000_000, '2.0'),
    ]
    const result = computeBiggestMover(assets)
    expect(result?.symbol).toBe('GOLD')
  })

  it('skips assets with NaN change string', () => {
    const assets = [
      makeAsset('BAD', 100_000_000, 'not-a-number'),
      makeAsset('GOLD', 5_000_000, '2.0'),
    ]
    const result = computeBiggestMover(assets)
    expect(result?.symbol).toBe('GOLD')
  })

  it('computes deltaIRT correctly for positive change', () => {
    // valueIRT = 10_000_000, change = 10%
    // previous = 10_000_000 / 1.10 ≈ 9_090_909
    // delta ≈ 909_091
    const assets = [makeAsset('GOLD', 10_000_000, '10')]
    const result = computeBiggestMover(assets)
    expect(result?.deltaIRT).toBeGreaterThan(900_000)
    expect(result?.deltaIRT).toBeLessThan(920_000)
  })

  it('computes deltaIRT correctly for negative change', () => {
    // valueIRT = 10_000_000, change = -10%
    // previous = 10_000_000 / 0.90 ≈ 11_111_111
    // delta ≈ -1_111_111
    const assets = [makeAsset('BTC', 10_000_000, '-10')]
    const result = computeBiggestMover(assets)
    expect(result?.deltaIRT).toBeLessThan(-1_100_000)
    expect(result?.deltaIRT).toBeGreaterThan(-1_120_000)
  })
})
