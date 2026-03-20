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

/**
 * Base asset symbol (e.g. USD). Prefers `base_currency.symbol`; if the API omits
 * it, derives from the trading pair `symbol` (e.g. USD-IRT → USD).
 */
export function getBaseSymbol(item: PriceItem): string {
  const fromBase = item.base_currency?.symbol
  if (fromBase) return fromBase
  const pair = item.symbol
  if (!pair) return ''
  const head = pair.split('-')[0]
  return head || pair
}

export function findBySymbol(
  items: PriceItem[],
  symbol: string,
): PriceItem | undefined {
  return items.find((item) => getBaseSymbol(item) === symbol)
}

export function filterPriceItems(
  items: PriceItem[],
  query: string,
): PriceItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) =>
      (item.name?.fa?.toLowerCase()?.includes(q) ?? false) ||
      (item.base_currency?.fa?.toLowerCase()?.includes(q) ?? false) ||
      (item.name?.en?.toLowerCase()?.includes(q) ?? false) ||
      (item.base_currency?.symbol?.toLowerCase()?.includes(q) ?? false),
  )
}

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
    if (!categoryOrder.includes(cat)) ordered.push([cat, items])
  }
  return ordered
}

/** Maps app locale (`en` | `fa`) to BCP 47 tag for `Intl` formatters. */
export function getIntlLocale(locale: string): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US'
}

export function formatIRT(value: number, locale = 'fa'): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(Math.round(value))
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
  const formatted = new Intl.NumberFormat(getIntlLocale(locale), {
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

export type BilingualDisplayNames = { fa: string; en: string }

export function getBilingualAssetLabels(
  priceItem: PriceItem | undefined,
  symbol: string,
): BilingualDisplayNames {
  if (!priceItem) {
    return { fa: symbol, en: symbol }
  }
  const name = priceItem.name
  const base = priceItem.base_currency
  const fa = name?.fa || base?.fa || symbol
  const en =
    name?.en ||
    base?.en ||
    name?.fa ||
    base?.fa ||
    symbol
  return { fa, en }
}

export function pickDisplayName(
  names: BilingualDisplayNames,
  locale: string,
): string {
  return locale === 'fa' ? names.fa : names.en
}

export function getLocalizedItemName(item: PriceItem, locale: string): string {
  return pickDisplayName(getBilingualAssetLabels(item, getBaseSymbol(item)), locale)
}

export function getLocalizedIrtName(locale: string): string {
  return locale === 'fa' ? IRT_ENTRY.fa : IRT_ENTRY.en
}

export function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
): string {
  const symbol = currency === 'USD' ? '$' : '€'
  const num =
    value < 1000
      ? Math.round(value).toLocaleString('en-US')
      : new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value)
  return `≈ ${symbol}${num}`
}
