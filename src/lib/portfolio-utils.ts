import type { PortfolioDeltaWindow } from '@/lib/portfolio-snapshot-delta'
import type { BilingualDisplayNames, PriceItem } from '@/lib/prices'
import {
  computeAssetValueIRT,
  findBySymbol,
  getBilingualAssetLabels,
  getSellPriceBySymbol,
  pickDisplayName,
} from '@/lib/prices'
import type { BreakdownItem } from '@/types/schemas'

interface AssetWithChange {
  symbol: string
  displayNames?: BilingualDisplayNames | null
  valueIRT: number
  change: string | null
}

export interface BiggestMover {
  symbol: string
  assetName: string
  deltaIRT: number
  changePct: number
  isPositive: boolean
}

const MIN_DELTA_IRT = 1000

export function computeBiggestMover(
  assets: AssetWithChange[],
  locale: string,
): BiggestMover | null {
  let biggest: BiggestMover | null = null
  let maxAbsDelta = 0

  for (const asset of assets) {
    if (!asset.change) continue
    const changePct = Number(asset.change)
    if (Number.isNaN(changePct) || changePct === 0) continue

    const denominator = 1 + changePct / 100
    if (denominator <= 0 || !Number.isFinite(denominator)) continue

    const previousValue = asset.valueIRT / denominator
    const deltaIRT = asset.valueIRT - previousValue
    const absDelta = Math.abs(deltaIRT)

    if (absDelta < MIN_DELTA_IRT) continue

    if (absDelta > maxAbsDelta) {
      maxAbsDelta = absDelta
      biggest = {
        symbol: asset.symbol,
        assetName: pickDisplayName(asset.displayNames, locale, asset.symbol),
        deltaIRT,
        changePct,
        isPositive: deltaIRT > 0,
      }
    }
  }

  return biggest
}

export interface BiggestMoverFromWindowInput {
  symbol: string
  displayNames?: BilingualDisplayNames | null
  valueIRT: number
  change: string | null
}

/**
 * Biggest mover from live 24h price `change` on asset rows (same as
 * `computeBiggestMover` but exported for callers that already hold asset rows).
 */
export function computeBiggestMoverFromAssetRows(
  assets: BiggestMoverFromWindowInput[],
  locale: string,
): BiggestMover | null {
  return computeBiggestMover(assets, locale)
}

type SymbolValueMap = Map<string, number>

function pctFromDelta(prevIRT: number, deltaIRT: number): number {
  if (prevIRT !== 0) return (deltaIRT / prevIRT) * 100
  if (deltaIRT === 0) return 0
  return deltaIRT > 0 ? 100 : -100
}

/**
 * Biggest absolute IRT move between previous snapshot per-symbol values and
 * current holdings (used for `1D`…`1M` windows when historical snapshots exist).
 */
export function computeBiggestMoverFromHistoricalBreakdown(
  prevBySymbol: SymbolValueMap,
  currentAssets: BiggestMoverFromWindowInput[],
  locale: string,
): BiggestMover | null {
  if (prevBySymbol.size === 0) return null

  const currentBySymbol = new Map<string, number>()
  for (const a of currentAssets) {
    currentBySymbol.set(a.symbol, a.valueIRT)
  }

  const symbols = new Set<string>([
    ...prevBySymbol.keys(),
    ...currentBySymbol.keys(),
  ])

  let biggest: BiggestMover | null = null
  let maxAbsDelta = 0

  for (const symbol of symbols) {
    const prevIRT = prevBySymbol.get(symbol) ?? 0
    const currIRT = currentBySymbol.get(symbol) ?? 0
    const deltaIRT = currIRT - prevIRT
    const absDelta = Math.abs(deltaIRT)

    if (absDelta < MIN_DELTA_IRT) continue

    if (absDelta > maxAbsDelta) {
      maxAbsDelta = absDelta
      const asset = currentAssets.find((x) => x.symbol === symbol)
      const changePct = pctFromDelta(prevIRT, deltaIRT)
      biggest = {
        symbol,
        assetName: pickDisplayName(asset?.displayNames, locale, symbol),
        deltaIRT,
        changePct,
        isPositive: deltaIRT > 0,
      }
    }
  }

  return biggest
}

export function shouldUseLivePriceChangeForBiggestMover(
  window: PortfolioDeltaWindow,
): boolean {
  return window === 'ALL'
}

/**
 * Returns the biggest 24h mover (by absolute IRT delta) from the user's
 * current portfolio breakdown, using live price `change` from price data.
 * Returns null when no asset crosses the minimum delta threshold.
 */
export function findBiggestMoverFromBreakdown(
  breakdown: BreakdownItem[],
  prices: PriceItem[],
  locale: string,
): BiggestMover | null {
  const assets: AssetWithChange[] = breakdown.map((item) => {
    const priceItem = findBySymbol(prices, item.symbol)
    const sellPrice = getSellPriceBySymbol(item.symbol, prices)
    const valueIRT = computeAssetValueIRT(item.quantity, sellPrice)
    return {
      symbol: item.symbol,
      displayNames: getBilingualAssetLabels(priceItem, item.symbol),
      valueIRT,
      change: priceItem?.change ?? null,
    }
  })
  return computeBiggestMover(assets, locale)
}

/**
 * Returns the display name of the top holding by current IRT value, used in
 * the daily digest message. Returns empty string when breakdown is empty.
 */
export function findTopHoldingByValue(
  breakdown: BreakdownItem[],
  prices: PriceItem[],
  locale: string,
): string {
  let topName = ''
  let maxValue = 0
  for (const item of breakdown) {
    const sellPrice = getSellPriceBySymbol(item.symbol, prices)
    const value = computeAssetValueIRT(item.quantity, sellPrice)
    if (value > maxValue) {
      maxValue = value
      const priceItem = findBySymbol(prices, item.symbol)
      topName = pickDisplayName(
        getBilingualAssetLabels(priceItem, item.symbol),
        locale,
      )
    }
  }
  return topName
}
