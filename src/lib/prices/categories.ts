import type { PriceItem } from './parse'

export function groupByCategory(items: PriceItem[]): Map<string, PriceItem[]> {
  const groups = new Map<string, PriceItem[]>()
  for (const item of items) {
    const cat = item.base_currency?.category?.symbol ?? 'OTHER'
    const existing = groups.get(cat) ?? []
    existing.push(item)
    groups.set(cat, existing)
  }
  return groups
}

export const categoryOrder: string[] = [
  'CURRENCY',
  'CRYPTOCURRENCY',
  'GOLD',
  'COIN',
  'SILVER',
  'BORS',
  'GOLD_FUNDS',
  'STOCK_FUNDS',
  'FIXED_INCOME_FUNDS',
  'MIXED_ASSET_FUNDS',
  'LEVERAGED_FUNDS',
  'SECTOR_FUNDS',
  'PROPERTY_FUNDS',
  'COMMODITY_SAFFRON_FUNDS',
  'OTHER',
]

export const knownCategories = new Set(categoryOrder)

export function sortedGroupEntries<T>(grouped: Map<string, T>): [string, T][] {
  const ordered: [string, T][] = []
  for (const cat of categoryOrder) {
    const items = grouped.get(cat)
    if (items) ordered.push([cat, items])
  }
  for (const [cat, items] of grouped) {
    if (!knownCategories.has(cat)) ordered.push([cat, items])
  }
  return ordered
}
