import type {
  PriceItem,
  PricesResponse,
} from '@/modules/API/Swagger/ecotrust/gen/models'

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

export const categoryLabels: Record<string, string> = {
  CURRENCY: 'ارز',
  CRYPTOCURRENCY: 'رمزارز',
  GOLD: 'طلا',
  COIN: 'سکه',
  SILVER: 'نقره',
  BORS: 'بورس',
  GOLD_FUNDS: 'صندوق طلا',
  STOCK_FUNDS: 'صندوق سهام',
  FIXED_INCOME_FUNDS: 'صندوق درآمد ثابت',
  MIXED_ASSET_FUNDS: 'صندوق مختلط',
  LEVERAGED_FUNDS: 'صندوق اهرمی',
  SECTOR_FUNDS: 'صندوق بخشی',
  PROPERTY_FUNDS: 'صندوق املاک',
  COMMODITY_SAFFRON_FUNDS: 'صندوق زعفران',
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
]

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

export function formatIRT(value: number): string {
  return new Intl.NumberFormat('fa-IR').format(Math.round(value))
}

export function formatChange(change: string | null | undefined): {
  text: string
  positive: boolean
} | null {
  if (!change) return null
  const n = Number(change)
  if (Number.isNaN(n)) return null
  const formatted = new Intl.NumberFormat('fa-IR', {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return { text: `${formatted}%`, positive: n >= 0 }
}

export function computeConversion(
  amount: string,
  fromSymbol: string,
  toSymbol: string,
  items: PriceItem[],
): string | null {
  const qty = Number(amount)
  if (!qty || qty <= 0) return null

  const fromSell =
    fromSymbol === 'IRT'
      ? 1
      : Number(findBySymbol(items, fromSymbol)?.sell_price ?? 0)
  const toSell =
    toSymbol === 'IRT'
      ? 1
      : Number(findBySymbol(items, toSymbol)?.sell_price ?? 0)

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
