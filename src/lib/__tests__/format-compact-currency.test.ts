import { describe, expect, it } from 'vitest'

import { formatCompactCurrency } from '@/lib/prices'

describe('formatCompactCurrency', () => {
  it('formats zero as full precision', () => {
    expect(formatCompactCurrency(0, 'USD')).toBe('≈ $0')
  })

  it('formats small USD value under 1000', () => {
    expect(formatCompactCurrency(742, 'USD')).toBe('≈ $742')
  })

  it('formats small EUR value under 1000', () => {
    expect(formatCompactCurrency(999, 'EUR')).toBe('≈ €999')
  })

  it('formats 1000 with compact notation', () => {
    expect(formatCompactCurrency(1000, 'USD')).toBe('≈ $1K')
  })

  it('formats value around 7000 with compact notation', () => {
    expect(formatCompactCurrency(7142, 'USD')).toBe('≈ $7.1K')
  })

  it('formats value around 142000 with compact notation', () => {
    expect(formatCompactCurrency(142000, 'USD')).toBe('≈ $142K')
  })

  it('formats million values with compact notation', () => {
    expect(formatCompactCurrency(1420000, 'EUR')).toBe('≈ €1.4M')
  })

  it('uses correct EUR symbol', () => {
    const result = formatCompactCurrency(500, 'EUR')
    expect(result).toBe('≈ €500')
  })

  it('uses correct USD symbol', () => {
    const result = formatCompactCurrency(500, 'USD')
    expect(result).toBe('≈ $500')
  })

  it('rounds small values to nearest integer', () => {
    expect(formatCompactCurrency(742.7, 'USD')).toBe('≈ $743')
  })

  it('formats exactly 999 without compact notation', () => {
    expect(formatCompactCurrency(999, 'USD')).toBe('≈ $999')
  })
})
