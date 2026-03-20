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
