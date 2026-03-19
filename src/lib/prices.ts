import type {
  PriceItem as EcotrustPriceItem,
  PricesResponse,
} from '@/modules/API/Swagger/ecotrust/gen/models'

export type PriceItem = EcotrustPriceItem

export function parsePriceSnapshot(data: unknown): PriceItem[] {
  if (!data || typeof data !== 'object') return []
  const response = data as PricesResponse
  return response?.data ?? []
}

export function findBySymbol(
  items: PriceItem[],
  symbol: string,
): PriceItem | undefined {
  return items.find((item) => item.base_currency.symbol === symbol)
}

export function filterPriceItems(
  items: PriceItem[],
  query: string,
): PriceItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      item.name.fa.toLowerCase().includes(q) ||
      item.base_currency.fa.toLowerCase().includes(q) ||
      item.name.en.toLowerCase().includes(q) ||
      item.base_currency.symbol.toLowerCase().includes(q),
  )
}

export function groupByCategory(items: PriceItem[]): Map<string, PriceItem[]> {
  const groups = new Map<string, PriceItem[]>()
  for (const item of items) {
    const cat = item.base_currency.category?.symbol ?? 'OTHER'
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

export function sortedGroupEntries(
  grouped: Map<string, PriceItem[]>,
): [string, PriceItem[]][] {
  const ordered: [string, PriceItem[]][] = []
  for (const cat of categoryOrder) {
    const items = grouped.get(cat)
    if (items) ordered.push([cat, items])
  }
  for (const [cat, items] of grouped) {
    if (!categoryOrder.includes(cat)) ordered.push([cat, items])
  }
  return ordered
}

function toIntlLocale(locale: string): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US'
}

export function formatIRT(value: number, locale = 'fa'): string {
  return new Intl.NumberFormat(toIntlLocale(locale)).format(Math.round(value))
}

export function formatChange(
  change: string | null | undefined,
  locale = 'fa',
): {
  text: string
  positive: boolean
} | null {
  if (!change) return null
  const n = Number(change)
  if (Number.isNaN(n)) return null
  const formatted = new Intl.NumberFormat(toIntlLocale(locale), {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return { text: `${formatted}%`, positive: n >= 0 }
}

export const STALE_AFTER_MINUTES = 60

export function getSnapshotStaleness(
  snapshotAt: Date | null | undefined,
  staleAfterMinutes = STALE_AFTER_MINUTES,
): { stale: boolean; minutesOld: number } {
  if (!snapshotAt) {
    return { stale: true, minutesOld: Number.POSITIVE_INFINITY }
  }

  const minutesOld = (Date.now() - snapshotAt.getTime()) / 1000 / 60
  return { stale: minutesOld > staleAfterMinutes, minutesOld }
}

export function getSellPriceBySymbol(
  symbol: string,
  items: PriceItem[],
): number {
  if (symbol === 'IRT') return 1
  const raw = findBySymbol(items, symbol)?.sell_price
  if (!raw) return 0
  const n = Number.parseFloat(raw)
  return Number.isNaN(n) ? 0 : n
}

export function computeConversion(
  amount: string,
  fromSymbol: string,
  toSymbol: string,
  items: PriceItem[],
): string | null {
  const qty = Number(amount)
  if (!qty || qty <= 0) return null

  const fromSell = getSellPriceBySymbol(fromSymbol, items)
  const toSell = getSellPriceBySymbol(toSymbol, items)

  if (fromSell === 0 || toSell === 0) return null

  const result = (qty * fromSell) / toSell
  return result.toFixed(4)
}

/** Synthetic IRT entry for the calculator selector */
export const IRT_ENTRY = {
  symbol: 'IRT',
  fa: 'تومان',
  en: 'Toman',
  png: null as string | null,
}

export function getLocalizedItemName(item: PriceItem, locale: string): string {
  if (locale === 'fa') return item.name.fa || item.base_currency.fa
  return (
    item.name.en ||
    item.base_currency.en ||
    item.name.fa ||
    item.base_currency.fa
  )
}

export function getLocalizedIrtName(locale: string): string {
  return locale === 'fa' ? IRT_ENTRY.fa : IRT_ENTRY.en
}

export function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
): string {
  const symbol = currency === 'USD' ? '$' : '€'

  if (value < 1000) {
    return `≈ ${symbol}${Math.round(value).toLocaleString('en-US')}`
  }

  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)

  return `≈ ${symbol}${formatted}`
}
