'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import type { BiggestMover } from '@/lib/portfolio-utils'

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
  const tAssets = useTranslations('assets')
  const locale = useLocale()
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US'

  const colorClass = isPositive ? 'text-success' : 'text-destructive'
  const bgClass = isPositive ? 'bg-success/10' : 'bg-destructive/10'
  const emoji = isPositive ? '📈' : '📉'

  // Use signDisplay: 'always' to get correct + / − signs for all cases
  const deltaFormatted = new Intl.NumberFormat(intlLocale, {
    signDisplay: 'always',
    maximumFractionDigits: 0,
  }).format(Math.round(deltaIRT))

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
      <div dir="ltr" className="flex flex-col items-end gap-0">
        <Text
          className={`font-display font-semibold text-sm tabular-nums ${colorClass}`}
        >
          {deltaFormatted}{' '}
          <span className="font-normal text-xs opacity-70">
            {tAssets('tomanAbbr')}
          </span>
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
