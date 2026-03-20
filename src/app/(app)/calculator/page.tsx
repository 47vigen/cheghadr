'use client'

import { useState } from 'react'

import { Button, Input, Label, TextField } from '@heroui/react'
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
import { Section } from '@/components/ui/section'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { computeConversion, parsePriceSnapshot } from '@/lib/prices'
import { TRPC_REFETCH_INTERVAL_MS } from '@/trpc/constants'
import { api } from '@/trpc/react'

export default function CalculatorPage() {
  const t = useTranslations('calculator')
  const tCommon = useTranslations('common')
  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery(undefined, {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    })

  const [fromSymbol, setFromSymbol] = useState('USD')
  const [toSymbol, setToSymbol] = useState('IRT')
  const [amount, setAmount] = useState('')

  const { isRefreshing } = usePullToRefresh(async () => {
    await refetch()
  })

  const prices = parsePriceSnapshot(data?.data)
  const { selectionChanged } = useTelegramHaptics()

  const result = amount
    ? computeConversion(amount, fromSymbol, toSymbol, prices)
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
        <Section header={t('title')} variant="hero">
          <AssetSelector
            label={t('from')}
            value={fromSymbol}
            onChange={setFromSymbol}
            items={prices}
          />
          <div className="relative my-2 h-px w-full bg-border">
            <Button
              size="md"
              isIconOnly
              variant="primary"
              onPress={handleSwap}
              aria-label={t('swap')}
              className="absolute inset-e-0 top-1/2 -translate-y-1/2"
            >
              <IconArrowsExchange size={24} className="rotate-90" />
            </Button>
          </div>
          <AssetSelector
            items={prices}
            label={t('to')}
            value={toSymbol}
            onChange={setToSymbol}
          />
          <TextField
            fullWidth
            value={amount}
            className="mt-6"
            onChange={setAmount}
          >
            <Label>{t('amount')}</Label>
            <Input
              type="number"
              inputMode="decimal"
              placeholder={t('amountPlaceholder')}
            />
          </TextField>
        </Section>

        <div>
          <CalculatorResult
            result={result}
            toSymbol={toSymbol}
            items={prices}
          />
        </div>
      </PageShell>
    </>
  )
}
