'use client'

import { Button, Text } from '@heroui/react'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import { getIntlLocale } from '@/lib/prices'

interface StalenessBannerProps {
  snapshotAt: Date | string | null
  namespace?: 'assets' | 'prices'
  onRefresh?: () => void
}

function formatRelativeTime(
  date: Date,
  locale: string,
  t: (
    key: 'minutesAgo' | 'hoursAgo' | 'daysAgo',
    values: { count: string },
  ) => string,
): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
  const intlLocale = getIntlLocale(locale)
  const formatCount = (n: number) => new Intl.NumberFormat(intlLocale).format(n)

  if (diffMin < 60) {
    return t('minutesAgo', { count: formatCount(diffMin) })
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return t('hoursAgo', { count: formatCount(diffHours) })
  }

  const diffDays = Math.floor(diffHours / 24)
  return t('daysAgo', { count: formatCount(diffDays) })
}

export function StalenessBanner({
  snapshotAt,
  namespace = 'prices',
  onRefresh,
}: StalenessBannerProps) {
  const locale = useLocale()

  const tPrices = useTranslations('prices')
  const tAssets = useTranslations('assets')
  const tCommon = useTranslations('common')

  const resolvedDate = snapshotAt ? new Date(snapshotAt) : null

  const label =
    namespace === 'prices'
      ? resolvedDate
        ? tPrices('staleWarning', {
            time: formatRelativeTime(resolvedDate, locale, tCommon),
          })
        : tPrices('checkLater')
      : tAssets('staleWarning')

  return (
    <div className="flex flex-wrap items-center justify-between gap-1 bg-warning/10 px-2 py-1">
      <div className="flex items-center gap-1">
        <IconAlertTriangle size={16} className="shrink-0 text-warning" />
        <Text className="text-foreground/90 text-sm">{label}</Text>
      </div>
      {onRefresh && (
        <Button variant="ghost" size="sm" onPress={onRefresh}>
          {tCommon('refresh')}
        </Button>
      )}
    </div>
  )
}
