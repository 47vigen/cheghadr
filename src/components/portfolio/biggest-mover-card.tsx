'use client'

import { Text } from '@heroui/react'
import { IconTrendingDown, IconTrendingUp } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import type { BiggestMover } from '@/lib/portfolio-utils'
import { getIntlLocale } from '@/lib/prices'

type BiggestMoverCardProps = Pick<
  BiggestMover,
  'assetName' | 'deltaIRT' | 'changePct' | 'isPositive'
> & {
  /** When set (e.g. windowed move), shown instead of "today". */
  periodLabel?: string
}

export function BiggestMoverCard({
  assetName,
  deltaIRT,
  changePct,
  isPositive,
  periodLabel,
}: BiggestMoverCardProps) {
  const t = useTranslations('breakdown')
  const tAssets = useTranslations('assets')
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)

  const colorClass = isPositive ? 'text-success' : 'text-destructive'
  const bgClass = isPositive ? 'bg-success/10' : 'bg-destructive/10'
  const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown

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
        <TrendIcon size={18} className={`shrink-0 ${colorClass}`} aria-hidden />
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
          <Text className="text-muted-foreground text-xs">
            {periodLabel ?? t('today')}
          </Text>
        </div>
      </div>
    </div>
  )
}
