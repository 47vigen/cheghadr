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

export function getLocalizedIrtName(locale: string): string {
  return locale === 'fa' ? IRT_ENTRY.fa : IRT_ENTRY.en
}
