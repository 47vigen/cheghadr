'use client'

import { Caption } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'

interface StalenessBannerProps {
  snapshotAt: Date | null
  /** 'prices' shows a timestamped warning; 'assets' shows a brief static note */
  namespace?: 'assets' | 'prices'
}

function formatRelativeTime(date: Date, locale: string): string {
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)

  if (diffMin < 60) {
    return locale === 'fa'
      ? `${new Intl.NumberFormat('fa-IR').format(diffMin)} دقیقه پیش`
      : `${diffMin} min ago`
  }

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) {
    return locale === 'fa'
      ? `${new Intl.NumberFormat('fa-IR').format(diffHours)} ساعت پیش`
      : `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  return locale === 'fa'
    ? `${new Intl.NumberFormat('fa-IR').format(diffDays)} روز پیش`
    : `${diffDays}d ago`
}

export function StalenessBanner({
  snapshotAt,
  namespace = 'prices',
}: StalenessBannerProps) {
  const locale = useLocale()

  const tPrices = useTranslations('prices')
  const tAssets = useTranslations('assets')

  const resolvedDate = snapshotAt ? new Date(snapshotAt) : null

  const label =
    namespace === 'prices'
      ? resolvedDate
        ? tPrices('staleWarning', { time: formatRelativeTime(resolvedDate, locale) })
        : tPrices('checkLater')
      : tAssets('staleWarning')

  return (
    <div className="flex items-center gap-1.5 px-4 py-1.5">
      <Caption level="2" className="text-tgui-hint">
        ⚠️ {label}
      </Caption>
    </div>
  )
}
