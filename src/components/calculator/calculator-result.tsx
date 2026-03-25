'use client'

import { useLocale, useTranslations } from 'next-intl'

import { Placeholder } from '@/components/ui/placeholder'

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

  const numResult = result ? Number(result) : null
  const formattedResult =
    numResult !== null
      ? toSymbol === 'IRT'
        ? formatIRT(numResult, locale)
        : new Intl.NumberFormat(intlLocale, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4,
          }).format(numResult)
      : null

  return (
    <div>
      <div className="mb-1.5 px-2">
        <h2 className="section-header">{t('resultTitle')}</h2>
      </div>
      <div className="overflow-hidden rounded-2xl bg-card">
        {!formattedResult ? (
          <Placeholder header={t('resultPlaceholder')} />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-5">
            <span className="font-display font-semibold text-[1.75rem] tabular-nums leading-tight tracking-tight">
              {formattedResult}
            </span>
            {toItem && (
              <span className="text-muted-foreground text-sm">
                {toItem.displayName}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
