'use client'

import { useState } from 'react'

import { Button, Input, Label, Spinner, Text, TextField } from '@heroui/react'
import { IconBriefcase } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AssetSelector } from '@/components/asset-selector'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { formatIRT, parsePriceSnapshot, getSellPriceBySymbol } from '@/lib/prices'
import { api } from '@/trpc/react'

type AlertType = 'PRICE' | 'PORTFOLIO'
type AlertDir = 'ABOVE' | 'BELOW'

const PORTFOLIO_SYMBOL = '__PORTFOLIO__'

export function CreateAlertForm() {
  const t = useTranslations('alerts')
  const locale = useLocale()
  const { notificationOccurred } = useTelegramHaptics()

  const [selectedSymbol, setSelectedSymbol] = useState('')
  const [direction, setDirection] = useState<AlertDir>('ABOVE')
  const [threshold, setThreshold] = useState('')

  const utils = api.useUtils()

  const { data: pricesData } = api.prices.latest.useQuery()
  const prices = parsePriceSnapshot(pricesData?.data)

  const { data: alertsList } = api.alerts.list.useQuery()
  const activeCount = alertsList?.filter((a) => a.isActive).length ?? 0
  const atLimit = activeCount >= 10

  const createMutation = api.alerts.create.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.alerts.list.invalidate()
      setSelectedSymbol('')
      setThreshold('')
      toast.success(t('toastCreated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastCreateError'))
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
    threshold !== '' &&
    Number(threshold) > 0 &&
    !createMutation.isPending

  const handleSubmit = () => {
    if (!canSubmit) return
    createMutation.mutate({
      type: alertType,
      symbol: isPortfolio ? undefined : selectedSymbol,
      direction,
      thresholdIRT: threshold,
    })
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {atLimit && (
        <Text className="text-sm text-warning">
          {t('maxAlertsReached', { max: 10 })}
        </Text>
      )}

      {/* Asset / Portfolio selector */}
      <div>
        {/* Portfolio option */}
        <Button
          variant={isPortfolio ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          className="mb-2"
          onPress={() => setSelectedSymbol(PORTFOLIO_SYMBOL)}
        >
          <IconBriefcase size={14} />
          {t('selectPortfolio')}
        </Button>

        {/* Asset selector (only prices, no IRT) */}
        {prices.length > 0 && (
          <AssetSelector
            label={t('selectAsset')}
            value={isPortfolio ? '' : selectedSymbol}
            onChange={(sym) => {
              if (sym === 'IRT') return
              setSelectedSymbol(sym)
            }}
            items={prices}
          />
        )}
      </div>

      {/* Current price hint */}
      {currentPrice !== null && currentPrice > 0 && (
        <Text className="ps-1 text-muted-foreground text-xs">
          {t('currentPrice', {
            price: formatIRT(currentPrice, locale),
          })}
        </Text>
      )}

      {/* Direction toggles */}
      <div className="flex gap-2">
        <Button
          variant={direction === 'ABOVE' ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          onPress={() => setDirection('ABOVE')}
        >
          {t('directionAbove')}
        </Button>
        <Button
          variant={direction === 'BELOW' ? 'primary' : 'secondary'}
          size="sm"
          fullWidth
          onPress={() => setDirection('BELOW')}
        >
          {t('directionBelow')}
        </Button>
      </div>

      {/* Threshold input */}
      <TextField
        value={threshold}
        onChange={setThreshold}
        fullWidth
        name="threshold"
      >
        <Label>{t('threshold')}</Label>
        <Input
          type="number"
          inputMode="decimal"
          placeholder={t('thresholdPlaceholder')}
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        />
      </TextField>

      <Button
        variant="primary"
        fullWidth
        onPress={handleSubmit}
        isDisabled={!canSubmit}
      >
        {createMutation.isPending ? (
          <Spinner size="sm" color="current" />
        ) : (
          t('createButton')
        )}
      </Button>
    </div>
  )
}
