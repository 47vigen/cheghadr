'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { formatCompactCurrency, formatIRT } from '@/lib/prices'

interface PortfolioTotalProps {
  totalIRT: number
  usdSellPrice?: number | null
  eurSellPrice?: number | null
}

export function PortfolioTotal({
  totalIRT,
  usdSellPrice,
  eurSellPrice,
}: PortfolioTotalProps) {
  const t = useTranslations('assets')
  const locale = useLocale()

  const showUsd = usdSellPrice != null && usdSellPrice > 0
  const showEur = eurSellPrice != null && eurSellPrice > 0

  return (
    <div className="flex flex-col items-start gap-0.5 py-2 ps-1">
      <Text className="label-compact text-muted-foreground">
        {t('totalValue')}
      </Text>
      <div className="flex items-baseline gap-1.5">
        <Text className="font-display font-semibold text-2xl tabular-nums sm:text-3xl">
          {formatIRT(totalIRT, locale)}
        </Text>
        <Text className="font-display text-muted-foreground text-sm">
          {t('toman')}
        </Text>
      </div>
      {(showUsd || showEur) && (
        <div className="flex items-baseline gap-3" dir="ltr">
          {showUsd && usdSellPrice != null && (
            <Text className="font-display text-muted-foreground text-sm tabular-nums">
              {formatCompactCurrency(totalIRT / usdSellPrice, 'USD')}
            </Text>
          )}
          {showEur && eurSellPrice != null && (
            <Text className="font-display text-muted-foreground text-sm tabular-nums">
              {formatCompactCurrency(totalIRT / eurSellPrice, 'EUR')}
            </Text>
          )}
        </div>
      )}
    </div>
  )
}
