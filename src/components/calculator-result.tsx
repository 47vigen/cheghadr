'use client'

import { Cell, Placeholder, Section, Text } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'

import {
  findBySymbol,
  formatIRT,
  getLocalizedIrtName,
  getLocalizedItemName,
  IRT_ENTRY,
} from '@/lib/prices'
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
  const t = useTranslations('calculator')
  const locale = useLocale()
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US'

  if (!result) {
    return (
      <Section header={t('resultTitle')}>
        <Placeholder header={t('resultPlaceholder')} />
      </Section>
    )
  }

  const toItem =
    toSymbol === 'IRT'
      ? { symbol: IRT_ENTRY.symbol, displayName: getLocalizedIrtName(locale), png: IRT_ENTRY.png }
      : (() => {
          const found = findBySymbol(items, toSymbol)
          return found
            ? {
                symbol: found.base_currency.symbol,
                displayName: getLocalizedItemName(found, locale),
                png: found.png ?? found.base_currency.png ?? null,
              }
            : null
        })()

  const numResult = Number(result)
  const formattedResult =
    toSymbol === 'IRT'
      ? formatIRT(numResult, locale)
      : new Intl.NumberFormat(intlLocale, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }).format(numResult)

  return (
    <Section header={t('resultTitle')}>
      <Cell subtitle={toItem?.displayName ?? toSymbol}>
        <Text weight="2" className="tabular-nums">
          {formattedResult}
        </Text>
      </Cell>
    </Section>
  )
}
