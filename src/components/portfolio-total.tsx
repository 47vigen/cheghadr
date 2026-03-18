'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { formatIRT } from '@/lib/prices'

interface PortfolioTotalProps {
  totalIRT: number
}

export function PortfolioTotal({ totalIRT }: PortfolioTotalProps) {
  const t = useTranslations('assets')
  const locale = useLocale()

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
    </div>
  )
}
