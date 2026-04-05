'use client'

import { useForm } from 'react-hook-form'

import { Label, Tabs, Text, toast } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { z } from 'zod/v4'

import { AssetSelector } from '@/components/assets/asset-selector'
import { NumberInputController } from '@/components/ui/number-input'
import { SubmitButton } from '@/components/ui/submit-button'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { MAX_ACTIVE_ALERTS } from '@/lib/alerts/utils'
import { formatIRT, getSellPriceBySymbol, parsePriceSnapshot } from '@/lib/prices'
import { api } from '@/trpc/react'

type AlertType = 'PRICE' | 'PORTFOLIO'
type AlertDir = 'ABOVE' | 'BELOW'

const PORTFOLIO_SYMBOL = '__PORTFOLIO__'

const alertSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['ABOVE', 'BELOW']),
  threshold: z.number({ error: 'Required' }).positive('Must be greater than 0'),
})

type AlertFormValues = z.infer<typeof alertSchema>

export function CreateAlertForm() {
  const t = useTranslations('alerts')
  const tAssets = useTranslations('assets')
  const locale = useLocale()
  const { notificationOccurred } = useTelegramHaptics()

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<AlertFormValues>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      symbol: '',
      direction: 'ABOVE',
      threshold: null as unknown as number,
    },
  })

  const symbol = watch('symbol')
  const direction = watch('direction')

  const utils = api.useUtils()

  const { data: pricesData } = api.prices.latest.useQuery()
  const prices = parsePriceSnapshot(pricesData?.data)

  const { data: alertsList } = api.alerts.list.useQuery()
  const activeCount =
    alertsList?.filter((a: { isActive: boolean }) => a.isActive).length ?? 0
  const atLimit = activeCount >= MAX_ACTIVE_ALERTS

  const createMutation = api.alerts.create.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.alerts.list.invalidate()
      reset()
      toast.success(t('toastCreated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastCreateError'))
    },
  })

  const isPortfolio = symbol === PORTFOLIO_SYMBOL
  const alertType: AlertType = isPortfolio ? 'PORTFOLIO' : 'PRICE'

  const currentPrice =
    !isPortfolio && symbol ? getSellPriceBySymbol(symbol, prices) : null

  const onSubmit = (data: AlertFormValues) => {
    createMutation.mutate({
      type: alertType,
      symbol: isPortfolio ? undefined : data.symbol,
      direction: data.direction,
      thresholdIRT: String(data.threshold),
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
            setValue('symbol', PORTFOLIO_SYMBOL, { shouldValidate: false })
          } else {
            setValue('symbol', '', { shouldValidate: false })
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
          value={symbol}
          onChange={(sym) => {
            if (sym === 'IRT') return
            setValue('symbol', sym, { shouldValidate: true })
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
        onSelectionChange={(key) =>
          setValue('direction', key as AlertDir, { shouldValidate: false })
        }
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

      <div>
        <Label className="font-medium text-sm">{t('threshold')}</Label>
        <NumberInputController
          name="threshold"
          control={control}
          formatOptions={{ maximumFractionDigits: 0, useGrouping: true }}
          minValue={0}
          allowDecimal={false}
          allowNegative={false}
          placeholder={t('thresholdPlaceholder')}
          suffix={tAssets('tomanAbbr')}
        />
      </div>

      <SubmitButton
        label={t('createButton')}
        isLoading={createMutation.isPending || isSubmitting}
        isDisabled={atLimit}
        onPress={() => void handleSubmit(onSubmit)()}
        className="bg-success text-success-foreground hover:opacity-95"
      />
    </div>
  )
}
