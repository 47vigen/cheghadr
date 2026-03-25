import {
  findBySymbol,
  getSellPriceBySymbol,
  type PriceItem,
  sortedGroupEntries,
} from '@/lib/prices'
import type { BreakdownItem } from '@/types/schemas'

export interface LiveBreakdownCategory {
  category: string
  valueIRT: number
  percentage: number
  assets: Array<BreakdownItem & { percentage: number }>
}

/**
 * Current holdings breakdown from user assets and latest prices (not from
 * PortfolioSnapshot rows — those are for history/export only).
 */
export function computeLivePortfolioBreakdown(
  userAssets: Array<{ symbol: string; quantity: unknown }>,
  prices: PriceItem[],
): { totalIRT: number; categories: LiveBreakdownCategory[] } | null {
  const categoryMap = new Map<
    string,
    { valueIRT: number; assets: BreakdownItem[] }
  >()

  let totalIRT = 0

  for (const asset of userAssets) {
    const priceItem = findBySymbol(prices, asset.symbol)
    const category = priceItem?.base_currency.category?.symbol ?? 'OTHER'
    const sellPrice = getSellPriceBySymbol(asset.symbol, prices)
    const qty = Number(asset.quantity)
    const valueIRT = qty * sellPrice
    totalIRT += valueIRT

    const item: BreakdownItem = {
      symbol: asset.symbol,
      quantity: qty,
      valueIRT,
    }
    const existing = categoryMap.get(category) ?? {
      valueIRT: 0,
      assets: [],
    }
    existing.valueIRT += valueIRT
    existing.assets.push(item)
    categoryMap.set(category, existing)
  }

  if (totalIRT === 0) return null

  const categories = sortedGroupEntries(categoryMap).map(
    ([category, bucket]) => ({
      category,
      valueIRT: bucket.valueIRT,
      percentage: (bucket.valueIRT / totalIRT) * 100,
      assets: bucket.assets.map((a) => ({
        ...a,
        percentage: (a.valueIRT / totalIRT) * 100,
      })),
    }),
  )

  return { totalIRT, categories }
}
