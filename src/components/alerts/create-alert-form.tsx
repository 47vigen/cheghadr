'use client'

import { useState } from 'react'

import {
  Button,
  Label,
  NumberField,
  Spinner,
  Tabs,
  Text,
  toast,
} from '@heroui/react'
import { clsx } from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

import { AssetSelector } from '@/components/assets/asset-selector'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import {
  formatIRT,
  getSellPriceBySymbol,
  parsePriceSnapshot,
} from '@/lib/prices'
import { api } from '@/trpc/react'

type AlertType = 'PRICE' | 'PORTFOLIO'
type AlertDir = 'ABOVE' | 'BELOW'

const PORTFOLIO_SYMBOL = '__PORTFOLIO__'

export function CreateAlertForm() {
  const t = useTranslations('alerts')
  const tAssets = useTranslations('assets')
  const locale = useLocale()
  const { notificationOccurred } = useTelegramHaptics()

  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [direction, setDirection] = useState<AlertDir>('ABOVE')
  const [threshold, setThreshold] = useState<number | undefined>(undefined)

  const utils = api.useUtils()

  const { data: pricesData } = api.prices.latest.useQuery()
  const prices = parsePriceSnapshot(pricesData?.data)

  const { data: alertsList } = api.alerts.list.useQuery()
  const activeCount = alertsList?.filter((a) => a.isActive).length ?? 0
  const atLimit = activeCount >= MAX_ACTIVE_ALERTS

  const createMutation = api.alerts.create.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.alerts.list.invalidate()
      setSelectedSymbol('')
      setThreshold(undefined)
      toast.success(t('toastCreated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastCreateError'))
    },
  })

  const isPortfolio = selectedSymbol === PORTFOLIO_SYMBOL
  const alertType: AlertType = isPortfolio ? 'PORTFOLIO' : 'PRICE'

  const currentPrice =
    !isPortfolio && selectedSymbol
      ? getSellPriceBySymbol(selectedSymbol, prices)
      : null

  const canSubmit =
    !atLimit &&
    selectedSymbol !== '' &&
    threshold !== undefined &&
    threshold > 0 &&
    !createMutation.isPending

  const handleSubmit = () => {
    if (!canSubmit || threshold === undefined) return
    createMutation.mutate({
      type: alertType,
      symbol: isPortfolio ? undefined : selectedSymbol,
      direction,
      thresholdIRT: String(threshold),
    })
  }

  return (
    <div className="flex flex-col gap-4 px-1 py-1">
      {atLimit && (
        <Text className="text-sm text-warning">
          {t('maxAlertsReached', { max: MAX_ACTIVE_ALERTS })}
        </Text>
      )}

      {/* Asset / Portfolio tab selector */}
      <Tabs
        selectedKey={isPortfolio ? 'portfolio' : 'asset'}
        onSelectionChange={(key) => {
          if (key === 'portfolio') {
            setSelectedSymbol(PORTFOLIO_SYMBOL)
          } else {
            setSelectedSymbol('')
          }
        }}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('selectAsset')} className="w-full">
            <Tabs.Tab id="asset" className="flex-1">
              {t('selectAsset')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="portfolio" className="flex-1">
              {t('selectPortfolio')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      {/* Asset dropdown — only shown in asset tab */}
      {!isPortfolio && prices.length > 0 && (
        <AssetSelector
          label={t('selectAsset')}
          value={selectedSymbol}
          onChange={(sym) => {
            if (sym === 'IRT') return
            setSelectedSymbol(sym)
          }}
          items={prices}
        />
      )}

      {currentPrice !== null && currentPrice > 0 && (
        <Text className="text-muted-foreground text-xs leading-relaxed">
          {t('currentPrice', {
            price: formatIRT(currentPrice, locale),
          })}
        </Text>
      )}

      {/* Above / Below tab selector */}
      <Tabs
        selectedKey={direction}
        onSelectionChange={(key) => setDirection(key as AlertDir)}
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('threshold')} className="w-full">
            <Tabs.Tab id="ABOVE" className="flex-1">
              {t('directionAbove')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="BELOW" className="flex-1">
              {t('directionBelow')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>

      <NumberField
        value={threshold}
        onChange={setThreshold}
        fullWidth
        minValue={0}
        formatOptions={{ maximumFractionDigits: 0, useGrouping: true }}
      >
        <Label>{t('threshold')}</Label>
        <div className="mt-2 min-w-0" dir="ltr">
          <NumberField.Group className="number-field__group !inline-flex !h-auto min-h-11 w-full min-w-0 items-stretch overflow-hidden rounded-xl border border-border/80 bg-surface/40 shadow-none transition-colors data-[focus-within]:border-primary/40 data-[focus-within]:bg-surface">
            <NumberField.Input
              placeholder={t('thresholdPlaceholder')}
              className="number-field__input min-h-11 min-w-0 flex-1 bg-transparent py-2.5 ps-3 pe-2 leading-normal"
            />
            <span
              aria-hidden
              className="flex max-w-[40%] shrink-0 items-center border-border/50 border-s px-3 font-medium text-muted-foreground text-sm tabular-nums"
            >
              {tAssets('tomanAbbr')}
            </span>
          </NumberField.Group>
        </div>
      </NumberField>


      <Button
        variant="primary"
        fullWidth
        size="lg"
        onPress={handleSubmit}
        isDisabled={!canSubmit}
        isPending={createMutation.isPending}
        className={clsx(
          canSubmit &&
            !createMutation.isPending &&
            'bg-success text-success-foreground hover:opacity-95',
        )}
      >
        {({ isPending }) =>
          isPending ? <Spinner size="sm" color="current" /> : t('createButton')
        }
      </Button>
    </div>
  )
}
