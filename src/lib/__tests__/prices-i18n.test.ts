import { describe, expect, it } from 'vitest'

import type { PriceItem } from '@/lib/prices'
import {
  getAssetListSubtitle,
  getBilingualAssetLabels,
  getLocalizedItemName,
  pickDisplayName,
} from '@/lib/prices'

const emptyCategory = {
  symbol: 'CURRENCY',
} as PriceItem['base_currency']['category']

function item(
  symbol: string,
  name: { fa: string; en: string },
  base: { fa: string; en: string },
): PriceItem {
  return {
    symbol: `${symbol}-IRT`,
    price_source: {} as PriceItem['price_source'],
    name: {
      symbol,
      fa: name.fa,
      en: name.en,
      category: emptyCategory,
    },
    base_currency: {
      symbol,
      fa: base.fa,
      en: base.en,
      category: emptyCategory,
    },
    quote_currency: {
      symbol: 'IRT',
      fa: 'تومان',
      en: 'Toman',
      category: emptyCategory,
    },
    sell_price: '1',
    buy_price: '1',
    is_tradable: true,
    created_at: '',
    is_up_to_date: true,
  }
}

describe('getBilingualAssetLabels', () => {
  it('returns symbol for both locales when price item is missing', () => {
    expect(getBilingualAssetLabels(undefined, 'USD')).toEqual({
      fa: 'USD',
      en: 'USD',
    })
  })

  it('uses name fa/en when present', () => {
    const pi = item('X', { fa: 'نام', en: 'Name' }, { fa: 'پایه', en: 'Base' })
    expect(getBilingualAssetLabels(pi, 'X')).toEqual({
      fa: 'نام',
      en: 'Name',
    })
  })

  it('falls back en to fa when english empty', () => {
    const pi = item('Y', { fa: 'فقط فارسی', en: '' }, { fa: 'پ', en: '' })
    const labels = getBilingualAssetLabels(pi, 'Y')
    expect(labels.fa).toBe('فقط فارسی')
    expect(labels.en).toBe('فقط فارسی')
  })

  it('handles missing name and base_currency without throwing', () => {
    const pi = {
      symbol: 'Z-IRT',
      name: undefined,
      base_currency: undefined,
    } as unknown as PriceItem
    expect(getBilingualAssetLabels(pi, 'Z')).toEqual({ fa: 'Z', en: 'Z' })
  })
})

describe('pickDisplayName', () => {
  it('picks fa or en by locale', () => {
    const n = { fa: 'الف', en: 'A' }
    expect(pickDisplayName(n, 'fa')).toBe('الف')
    expect(pickDisplayName(n, 'en')).toBe('A')
  })

  it('uses fallback when names missing or empty branch', () => {
    expect(pickDisplayName(undefined, 'en', 'SYM')).toBe('SYM')
    expect(pickDisplayName(null, 'fa', 'X')).toBe('X')
    expect(pickDisplayName({ fa: '', en: '' }, 'en', 'DEF')).toBe('DEF')
  })
})

describe('getLocalizedItemName', () => {
  it('delegates to bilingual labels', () => {
    const pi = item(
      'USD',
      { fa: 'دلار', en: 'Dollar' },
      { fa: 'دلار', en: 'Dollar' },
    )
    expect(getLocalizedItemName(pi, 'en')).toBe('Dollar')
    expect(getLocalizedItemName(pi, 'fa')).toBe('دلار')
  })
})

describe('getAssetListSubtitle', () => {
  it('for fa locale returns symbol as secondary line', () => {
    const pi = item(
      'USD',
      { fa: 'دلار آمریکا', en: 'US Dollar' },
      { fa: 'دلار', en: 'Dollar' },
    )
    expect(getAssetListSubtitle(pi, 'fa', 'USD')).toBe('USD')
  })

  it('for en locale returns symbol as secondary line', () => {
    const pi = item(
      'AED',
      { fa: 'درهم امارات', en: 'UAE Dirham' },
      { fa: 'درهم', en: 'Dirham' },
    )
    expect(getAssetListSubtitle(pi, 'en', 'AED')).toBe('AED')
  })

  it('for en locale falls back to symbol when names match', () => {
    const pi = item(
      'USD',
      { fa: 'US Dollar', en: 'US Dollar' },
      { fa: 'US Dollar', en: 'US Dollar' },
    )
    expect(getAssetListSubtitle(pi, 'en', 'USD')).toBe('USD')
  })
})
