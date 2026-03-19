export const CATEGORY_COLORS: Record<string, string> = {
  CURRENCY: 'oklch(0.65 0.18 250)',
  CRYPTOCURRENCY: 'oklch(0.65 0.18 310)',
  GOLD: 'oklch(0.75 0.16 85)',
  COIN: 'oklch(0.70 0.14 55)',
  SILVER: 'oklch(0.70 0.02 0)',
  BORS: 'oklch(0.60 0.12 180)',
  GOLD_FUNDS: 'oklch(0.72 0.12 80)',
  STOCK_FUNDS: 'oklch(0.58 0.14 200)',
  FIXED_INCOME_FUNDS: 'oklch(0.62 0.08 220)',
  MIXED_ASSET_FUNDS: 'oklch(0.64 0.10 260)',
  LEVERAGED_FUNDS: 'oklch(0.60 0.16 290)',
  SECTOR_FUNDS: 'oklch(0.65 0.12 160)',
  PROPERTY_FUNDS: 'oklch(0.67 0.10 40)',
  COMMODITY_SAFFRON_FUNDS: 'oklch(0.72 0.18 60)',
  OTHER: 'oklch(0.60 0.06 0)',
}

const FALLBACK_COLOR = 'oklch(0.60 0.06 0)'

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? FALLBACK_COLOR
}
