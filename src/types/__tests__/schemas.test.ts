import { describe, expect, it } from 'vitest'

import { parseBreakdownJson } from '@/types/schemas'

describe('parseBreakdownJson', () => {
  it('parses valid breakdown arrays', () => {
    const raw = [
      { symbol: 'USD', quantity: 2, valueIRT: 100 },
      { symbol: 'GOLD', quantity: 1, valueIRT: 50 },
    ]
    expect(parseBreakdownJson(raw)).toEqual(raw)
  })

  it('returns empty array for invalid shapes', () => {
    expect(parseBreakdownJson(null)).toEqual([])
    expect(parseBreakdownJson([{ symbol: 1 }])).toEqual([])
    expect(parseBreakdownJson({})).toEqual([])
  })

  it('returns empty array for empty input array', () => {
    expect(parseBreakdownJson([])).toEqual([])
  })

  it('accepts decimal quantity and valueIRT', () => {
    const raw = [{ symbol: 'BTC', quantity: 0.00123456, valueIRT: 5_000_000_000.5 }]
    expect(parseBreakdownJson(raw)).toEqual(raw)
  })

  it('accepts zero quantity and valueIRT', () => {
    const raw = [{ symbol: 'USD', quantity: 0, valueIRT: 0 }]
    expect(parseBreakdownJson(raw)).toEqual(raw)
  })

  it('accepts negative valueIRT', () => {
    const raw = [{ symbol: 'USD', quantity: 1, valueIRT: -500 }]
    expect(parseBreakdownJson(raw)).toEqual(raw)
  })

  it('strips extra fields and returns only schema fields', () => {
    const raw = [{ symbol: 'USD', quantity: 1, valueIRT: 100, extra: 'ignored' }]
    const result = parseBreakdownJson(raw)
    expect(result).toEqual([{ symbol: 'USD', quantity: 1, valueIRT: 100 }])
    expect((result[0] as Record<string, unknown>).extra).toBeUndefined()
  })

  it('returns empty array when any item in array is invalid', () => {
    // One valid item, one invalid — the entire array fails validation
    const mixed = [
      { symbol: 'USD', quantity: 1, valueIRT: 100 },
      { symbol: 42, quantity: 1, valueIRT: 100 }, // symbol is number, not string
    ]
    expect(parseBreakdownJson(mixed)).toEqual([])
  })

  it('returns empty array when item is missing required fields', () => {
    expect(parseBreakdownJson([{ symbol: 'USD' }])).toEqual([])
    expect(parseBreakdownJson([{ quantity: 1, valueIRT: 100 }])).toEqual([])
    expect(parseBreakdownJson([{ symbol: 'USD', quantity: 1 }])).toEqual([])
  })

  it('returns empty array for non-array primitives', () => {
    expect(parseBreakdownJson(undefined)).toEqual([])
    expect(parseBreakdownJson(42)).toEqual([])
    expect(parseBreakdownJson('string')).toEqual([])
  })
})
