import { describe, expect, it } from 'vitest'

import { CATEGORY_COLORS, getCategoryColor } from '@/lib/category-colors'

describe('getCategoryColor', () => {
  it('returns mapped color for known categories', () => {
    expect(getCategoryColor('GOLD')).toBe(CATEGORY_COLORS.GOLD)
    expect(getCategoryColor('CRYPTOCURRENCY')).toBe(
      CATEGORY_COLORS.CRYPTOCURRENCY,
    )
  })

  it('falls back to OTHER for unknown categories', () => {
    expect(getCategoryColor('UNKNOWN_SYMBOL_XYZ')).toBe(CATEGORY_COLORS.OTHER)
  })
})
