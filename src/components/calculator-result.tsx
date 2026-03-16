import { Caption, LargeTitle, Section, Text } from '@telegram-apps/telegram-ui'

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
      <Section>
        <div className="flex min-h-[80px] items-center justify-center p-4">
          <Caption level="1" className="text-tgui-hint">
            نتیجه اینجا نمایش داده می‌شود
          </Caption>
        </div>
      </Section>
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
    <Section header="نتیجه">
      <div className="flex flex-col items-center gap-1 p-6">
        <div className="flex items-baseline gap-1.5">
          <LargeTitle weight="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {formattedResult}
          </LargeTitle>
          <Text weight="3" className="text-tgui-hint">
            {toItem?.fa ?? toSymbol}
          </Text>
        </div>
      </div>
    </Section>
  )
}
