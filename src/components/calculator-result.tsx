import { Cell, Placeholder, Section, Text } from '@telegram-apps/telegram-ui'

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
      <Section header="نتیجه">
        <Placeholder header="نتیجه اینجا نمایش داده می‌شود" />
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
      <Cell subtitle={toItem?.fa ?? toSymbol}>
        <Text weight="2" className="tabular-nums">
          {formattedResult}
        </Text>
      </Cell>
    </Section>
  )
}
