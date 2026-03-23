/**
 * Tests for the useAssetSearchGroups hook.
 *
 * The hook composes filterPriceItems → groupByCategory → sortedGroupEntries
 * with a translated category label, wrapped in useMemo.
 *
 * We test the composition and output shape by mocking next-intl's
 * useTranslations so we can run in the Vitest node environment without
 * a full Next.js i18n setup.
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// @vitest-environment jsdom

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => `[${key}]`,
}))

import { useAssetSearchGroups } from '../use-asset-search-groups'

function makeItem(symbol: string, category: string, fa: string, en: string) {
  return {
    // groupByCategory reads item.base_currency?.category?.symbol
    base_currency: { symbol, category: { symbol: category }, png: null, fa, en },
    name: { fa, en },
    sell_price: '1000',
    change: '0',
    png: null,
  }
}

const ITEMS = [
  makeItem('USD', 'CURRENCY', 'دلار', 'US Dollar'),
  makeItem('EUR', 'CURRENCY', 'یورو', 'Euro'),
  makeItem('BTC', 'CRYPTOCURRENCY', 'بیت‌کوین', 'Bitcoin'),
  makeItem('GOLD', 'GOLD', 'طلا', 'Gold'),
]

describe('useAssetSearchGroups', () => {
  it('returns all items grouped by category when search is empty', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, ''))

    const categories = result.current.map((g) => g.category)
    expect(categories).toContain('CURRENCY')
    expect(categories).toContain('CRYPTOCURRENCY')
    expect(categories).toContain('GOLD')
  })

  it('filters items by English search query', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, 'bitcoin'))

    const allItems = result.current.flatMap((g) => g.items)
    expect(allItems).toHaveLength(1)
    expect(allItems[0].base_currency.symbol).toBe('BTC')
  })

  it('filters items by Persian search query', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, 'دلار'))

    const allItems = result.current.flatMap((g) => g.items)
    expect(allItems).toHaveLength(1)
    expect(allItems[0].base_currency.symbol).toBe('USD')
  })

  it('returns empty groups when search matches nothing', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, 'xyznotfound'))

    expect(result.current).toHaveLength(0)
  })

  it('includes translated category label for known categories', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, ''))

    const currencyGroup = result.current.find((g) => g.category === 'CURRENCY')
    // Our mock returns "[CURRENCY]"
    expect(currencyGroup?.categoryLabel).toBe('[CURRENCY]')
  })

  it('uses raw category symbol as label for unknown categories', () => {
    const itemsWithUnknownCat = [
      makeItem('XYZ', 'EXOTIC_UNKNOWN', 'ایکس', 'XYZ'),
    ]
    const { result } = renderHook(() => useAssetSearchGroups(itemsWithUnknownCat, ''))

    const group = result.current.find((g) => g.category === 'EXOTIC_UNKNOWN')
    // Unknown categories use the raw symbol as the label (not run through tCat)
    expect(group?.categoryLabel).toBe('EXOTIC_UNKNOWN')
  })

  it('returns empty array for empty items list', () => {
    const { result } = renderHook(() => useAssetSearchGroups([], 'bitcoin'))

    expect(result.current).toHaveLength(0)
  })

  it('search is case-insensitive for English terms', () => {
    const { result } = renderHook(() => useAssetSearchGroups(ITEMS, 'BITCOIN'))

    const allItems = result.current.flatMap((g) => g.items)
    expect(allItems).toHaveLength(1)
    expect(allItems[0].base_currency.symbol).toBe('BTC')
  })
})
