'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Cell } from '@/components/ui/cell'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import type { PriceItem } from '@/lib/prices'
import {
  findBySymbol,
  formatIRT,
  getBaseSymbol,
  getIntlLocale,
  getLocalizedIrtName,
  getLocalizedItemName,
  IRT_ENTRY,
} from '@/lib/prices'

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
  const intlLocale = getIntlLocale(locale)

  if (!result) {
    return (
      <Section header={t('resultTitle')}>
        <Placeholder header={t('resultPlaceholder')} />
      </Section>
    )
  }

  const toItem =
    toSymbol === 'IRT'
      ? {
          symbol: IRT_ENTRY.symbol,
          displayName: getLocalizedIrtName(locale),
          png: IRT_ENTRY.png,
        }
      : (() => {
          const found = findBySymbol(items, toSymbol)
          return found
            ? {
                symbol: getBaseSymbol(found),
                displayName: getLocalizedItemName(found, locale),
                png: found.png ?? found.base_currency?.png ?? null,
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
        <span className="font-display font-semibold tabular-nums">
          {formattedResult}
        </span>
      </Cell>
    </Section>
  )
}
