'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import type { BiggestMover } from '@/lib/portfolio-utils'
import { formatIRT } from '@/lib/prices'

type BiggestMoverCardProps = Pick<
  BiggestMover,
  'assetName' | 'deltaIRT' | 'changePct' | 'isPositive'
>

export function BiggestMoverCard({
  assetName,
  deltaIRT,
  changePct,
  isPositive,
}: BiggestMoverCardProps) {
  const t = useTranslations('breakdown')
  const locale = useLocale()
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US'

  const colorClass = isPositive ? 'text-success' : 'text-destructive'
  const bgClass = isPositive ? 'bg-success/10' : 'bg-destructive/10'
  const emoji = isPositive ? '📈' : '📉'

  const sign = isPositive ? '+' : ''
  const deltaFormatted = `${sign}${formatIRT(Math.abs(deltaIRT), locale)}`

  const pctFormatted = new Intl.NumberFormat(intlLocale, {
    signDisplay: 'always',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(changePct)

  return (
    <div
      className={`flex items-center justify-between rounded-[var(--radius)] px-3 py-2.5 ${bgClass}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base" role="img" aria-hidden>
          {emoji}
        </span>
        <Text className="font-display font-medium text-sm">{assetName}</Text>
      </div>
      <div className="flex flex-col items-end gap-0" dir="ltr">
        <Text
          className={`font-display font-semibold text-sm tabular-nums ${colorClass}`}
        >
          {deltaFormatted} <span className="font-normal text-xs opacity-70">{locale === 'fa' ? 'ت' : 'T'}</span>
        </Text>
        <div className="flex items-center gap-1.5">
          <Text className={`font-display text-xs tabular-nums ${colorClass}`}>
            ({pctFormatted}%)
          </Text>
          <Text className="text-muted-foreground text-xs">{t('today')}</Text>
        </div>
      </div>
    </div>
  )
}
