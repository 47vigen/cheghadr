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
})
