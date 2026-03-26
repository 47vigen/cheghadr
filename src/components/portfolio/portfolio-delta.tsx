'use client'

import { useState } from 'react'

import { Button, Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { formatIRT, getIntlLocale } from '@/lib/prices'
import { TRPC_REFETCH_INTERVAL_MS } from '@/trpc/constants'
import { api } from '@/trpc/react'

export type DeltaWindow = '1D' | '1W' | '1M' | 'ALL'

const WINDOWS: DeltaWindow[] = ['1D', '1W', '1M', 'ALL']

interface PortfolioDeltaProps {
  portfolioId?: string
  /** IANA timezone; must match trend chart / biggest mover. */
  timezone?: string
  /** When both `window` and `onWindowChange` are set, selection is controlled by the parent. */
  window?: DeltaWindow
  onWindowChange?: (window: DeltaWindow) => void
}

export function PortfolioDelta({
  portfolioId,
  timezone = 'UTC',
  window: windowProp,
  onWindowChange,
}: PortfolioDeltaProps = {}) {
  const [uncontrolledWindow, setUncontrolledWindow] =
    useState<DeltaWindow>('1D')
  const window = windowProp ?? uncontrolledWindow
  const t = useTranslations('delta')
  const locale = useLocale()
  const { selectionChanged } = useTelegramHaptics()

  const { data, isLoading } = api.portfolio.delta.useQuery(
    portfolioId ? { window, portfolioId, timezone } : { window, timezone },
    { refetchInterval: TRPC_REFETCH_INTERVAL_MS },
  )

  if (!data && !isLoading) return null

  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-1.5 ps-1 pb-1">
        <div className="h-5 w-32 animate-pulse bg-muted" />
        <div className="flex gap-1">
          {WINDOWS.map((w) => (
            <div key={w} className="h-6 w-12 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const { deltaIRT, deltaPct } = data
  const isPositive = deltaIRT > 0
  const isZero = deltaIRT === 0

  const colorClass = isZero
    ? 'text-muted-foreground'
    : isPositive
      ? 'text-success'
      : 'text-destructive'

  const sign = deltaIRT > 0 ? '+' : deltaIRT < 0 ? '-' : ''

  const pctFormatted = new Intl.NumberFormat(getIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(deltaPct))

  const windowLabels: Record<DeltaWindow, string> = {
    '1D': t('window1D'),
    '1W': t('window1W'),
    '1M': t('window1M'),
    ALL: t('windowALL'),
  }

  const handleWindowChange = (w: DeltaWindow) => {
    if (onWindowChange) {
      onWindowChange(w)
    } else {
      setUncontrolledWindow(w)
    }
    selectionChanged()
  }

  return (
    <div className="flex flex-col gap-1.5 ps-1 pb-1">
      <div className="flex items-baseline gap-1.5">
        <Text
          className={`font-display font-semibold text-base tabular-nums ${colorClass}`}
        >
          {sign}
          {formatIRT(Math.abs(Math.round(deltaIRT)), locale)}
        </Text>
        <Text className={`font-display text-sm tabular-nums ${colorClass}`}>
          ({isPositive ? '+' : deltaIRT < 0 ? '-' : ''}
          {pctFormatted}
          {locale === 'fa' ? '٪' : '%'})
        </Text>
      </div>

      <div className="flex flex-wrap gap-1">
        {WINDOWS.map((w) => (
          <Button
            key={w}
            size="sm"
            variant={window === w ? 'primary' : 'secondary'}
            onPress={() => handleWindowChange(w)}
            className="h-6 min-w-0 px-2 text-xs"
          >
            {windowLabels[w]}
          </Button>
        ))}
      </div>
    </div>
  )
}
