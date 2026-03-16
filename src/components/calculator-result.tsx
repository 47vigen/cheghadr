import { findBySymbol, formatIRT, IRT_ENTRY } from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface CalculatorResultProps {
  result: string | null
  toSymbol: string
  items: PriceItem[]
}

export function CalculatorResult({
  result,
  toSymbol,
  items,
}: CalculatorResultProps) {
  if (!result) {
    return (
      <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-border bg-muted/50 p-4">
        <p className="text-muted-foreground text-sm">
          نتیجه اینجا نمایش داده می‌شود
        </p>
      </div>
    )
  }

  const toItem =
    toSymbol === 'IRT'
      ? IRT_ENTRY
      : (() => {
          const found = findBySymbol(items, toSymbol)
          return found
            ? {
                symbol: found.base_currency.symbol,
                fa: found.name.fa || found.base_currency.fa,
                en: found.name.en || found.base_currency.en,
                png: found.png ?? found.base_currency.png ?? null,
              }
            : null
        })()

  const numResult = Number(result)
  const formattedResult =
    toSymbol === 'IRT'
      ? formatIRT(numResult)
      : new Intl.NumberFormat('fa-IR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }).format(numResult)

  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-6">
      <p className="text-muted-foreground text-xs">نتیجه</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-3xl tabular-nums">
          {formattedResult}
        </span>
        <span className="text-muted-foreground text-sm">
          {toItem?.fa ?? toSymbol}
        </span>
      </div>
    </div>
  )
}
