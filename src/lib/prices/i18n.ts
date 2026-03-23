import { getBaseSymbol, IRT_ENTRY, type PriceItem } from './parse'

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
  const en = name?.en || base?.en || name?.fa || base?.fa || symbol
  return { fa, en }
}

export function pickDisplayName(
  names: BilingualDisplayNames | null | undefined,
  locale: string,
  fallback = '',
): string {
  if (!names) return fallback
  const picked = locale === 'fa' ? names.fa : names.en
  return picked ? picked : fallback
}

export function getLocalizedItemName(item: PriceItem, locale: string): string {
  return pickDisplayName(
    getBilingualAssetLabels(item, getBaseSymbol(item)),
    locale,
  )
}

/** Secondary line for asset lists: other language or symbol — never duplicates the primary title. */
export function getAssetListSubtitle(
  item: PriceItem,
  locale: string,
  symbol: string,
): string | undefined {
  const labels = getBilingualAssetLabels(item, symbol)
  const primary = getLocalizedItemName(item, locale)
  if (locale === 'fa') {
    return labels.en && labels.en !== primary ? labels.en : undefined
  }
  if (labels.fa && labels.fa !== primary) {
    return labels.fa
  }
  if (symbol && symbol !== primary) {
    return symbol
  }
  return undefined
}

export function getLocalizedIrtName(locale: string): string {
  return locale === 'fa' ? IRT_ENTRY.fa : IRT_ENTRY.en
}
