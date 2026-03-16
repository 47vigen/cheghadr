'use client'

import { Caption } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'

interface StalenessBannerProps {
  snapshotAt: Date | null
  namespace?: 'assets' | 'prices'
}

function formatRelativeTime(date: Date, locale: string): string {
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 60) {
    if (locale === 'fa') {
      return `${new Intl.NumberFormat('fa-IR').format(diffMin)} دقیقه پیش`
    }
    return `${diffMin} minutes ago`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    if (locale === 'fa') {
      return `${new Intl.NumberFormat('fa-IR').format(diffHours)} ساعت پیش`
    }
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (locale === 'fa') {
    return `${new Intl.NumberFormat('fa-IR').format(diffDays)} روز پیش`
  }
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

export function StalenessBanner({
  snapshotAt,
  namespace = 'prices',
}: StalenessBannerProps) {
  const t = useTranslations(namespace)
  const locale = useLocale()

  const timeStr = snapshotAt
    ? formatRelativeTime(
        snapshotAt instanceof Date ? snapshotAt : new Date(snapshotAt),
        locale,
      )
    : null

  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      <Caption level="2" className="text-tgui-hint">
        ⚠️{' '}
        {timeStr
          ? t('staleWarning', { time: timeStr })
          : (t as (k: string) => string)('staleWarning').replace(
              / \{time\}/,
              '',
            )}
      </Caption>
    </div>
  )
}
