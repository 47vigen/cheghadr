import type { BilingualDisplayNames } from '@/lib/prices'
import { pickDisplayName } from '@/lib/prices'

interface AssetWithChange {
  symbol: string
  displayNames: BilingualDisplayNames
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
        assetName: pickDisplayName(asset.displayNames, locale),
        deltaIRT,
        changePct,
        isPositive: deltaIRT > 0,
      }
    }
  }

  return biggest
}
