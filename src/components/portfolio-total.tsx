'use client'

import { LargeTitle, Text } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'

import { formatIRT } from '@/lib/prices'

interface PortfolioTotalProps {
  totalIRT: number
}

export function PortfolioTotal({ totalIRT }: PortfolioTotalProps) {
  const t = useTranslations('assets')
  const locale = useLocale()

  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-baseline gap-1.5">
        <LargeTitle weight="2" className="tabular-nums">
          {formatIRT(totalIRT, locale)}
        </LargeTitle>
        <Text weight="3" className="text-tgui-hint">
          {t('toman')}
        </Text>
      </div>
    </div>
  )
}
