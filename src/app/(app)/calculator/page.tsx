'use client'

import { useState } from 'react'

import { Button, Label } from '@heroui/react'
import { IconArrowsExchange } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AssetSelector } from '@/components/assets/asset-selector'
import { CalculatorResult } from '@/components/calculator/calculator-result'
import { PageShell } from '@/components/layout/page-shell'
import { CalculatorSkeleton } from '@/components/skeletons/calculator-skeleton'
import {
  EmptyState,
  ErrorState,
  RefreshIndicator,
} from '@/components/ui/async-states'
import { NumberInput } from '@/components/ui/number-input'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { computeConversion, parsePriceSnapshot } from '@/lib/prices'
import { REFETCH_PRICES_MS } from '@/trpc/constants'
import { api } from '@/trpc/react'

export default function CalculatorPage() {
  const t = useTranslations('calculator')
  const tCommon = useTranslations('common')
  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery(undefined, {
      refetchInterval: REFETCH_PRICES_MS,
      refetchOnWindowFocus: true,
    })

  const [fromSymbol, setFromSymbol] = useState('USD')
  const [toSymbol, setToSymbol] = useState('IRT')
  const [amount, setAmount] = useState<number | null>(null)

  const { isRefreshing } = usePullToRefresh(async () => {
    await refetch()
  })

  const prices = parsePriceSnapshot(data?.data)
  const { selectionChanged } = useTelegramHaptics()

  const result =
    amount !== null && amount > 0
      ? computeConversion(String(amount), fromSymbol, toSymbol, prices)
      : null

  const handleSwap = () => {
    selectionChanged()
    setFromSymbol(toSymbol)
    setToSymbol(fromSymbol)
  }

  if (isLoading) {
    return <CalculatorSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        header={t('title')}
        description={error?.message || t('resultPlaceholder')}
        retryLabel={tCommon('retry')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState header={t('title')} description={t('resultPlaceholder')} />
    )
  }

  return (
    <>
      <RefreshIndicator isRefreshing={isRefreshing} />
      <PageShell>
        {/* Converter card */}
        <div>
          <div className="mb-1.5 px-2">
            <h2 className="section-header">{t('title')}</h2>
          </div>
          <div className="overflow-hidden border border-border bg-card-elevated">
            {/* From selector */}
            <div className="px-3 pt-2.5 pb-1.5">
              <AssetSelector
                label={t('from')}
                value={fromSymbol}
                onChange={setFromSymbol}
                items={prices}
                noBorder
              />
            </div>

            {/* Swap row */}
            <div className="flex items-center px-4">
              <div className="h-px flex-1 bg-border/40" />
              <Button
                size="sm"
                isIconOnly
                variant="ghost"
                onPress={handleSwap}
                aria-label={t('swap')}
                className="mx-3 shrink-0 border border-border"
              >
                <IconArrowsExchange size={16} className="rotate-90" />
              </Button>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            {/* To selector */}
            <div className="px-3 pt-1.5 pb-2.5">
              <AssetSelector
                items={prices}
                label={t('to')}
                value={toSymbol}
                onChange={setToSymbol}
                noBorder
              />
            </div>

            {/* Divider */}
            <div className="mx-3 border-border/40 border-t" />

            {/* Amount input */}
            <div className="px-3 pt-2.5 pb-3">
              <Label className="section-header mb-1.5 block">{t('amount')}</Label>
              <NumberInput
                value={amount}
                onChange={setAmount}
                formatOptions={{ maximumFractionDigits: 8, useGrouping: false }}
                minValue={0}
                allowNegative={false}
                placeholder={t('amountPlaceholder')}
              />
            </div>
          </div>
        </div>

        <CalculatorResult result={result} toSymbol={toSymbol} items={prices} />
      </PageShell>
    </>
  )
}
