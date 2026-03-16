'use client'

import { useState } from 'react'

import { IconArrowsExchange } from '@tabler/icons-react'
import {
  Cell,
  IconButton,
  Input,
  List,
  Section,
} from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { AssetSelector } from '@/components/asset-selector'
import { CalculatorResult } from '@/components/calculator-result'
import { CalculatorSkeleton } from '@/components/skeletons/calculator-skeleton'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { computeConversion, parsePriceSnapshot } from '@/lib/prices'
import { api } from '@/trpc/react'

export default function CalculatorPage() {
  const t = useTranslations('calculator')
  const { data, isLoading } = api.prices.latest.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const [fromSymbol, setFromSymbol] = useState('USD')
  const [toSymbol, setToSymbol] = useState('IRT')
  const [amount, setAmount] = useState('')

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

  return (
    <List>
      <Section header={t('title')}>
        <AssetSelector
          label={t('from')}
          value={fromSymbol}
          onChange={setFromSymbol}
          items={prices}
        />
        <Cell onClick={handleSwap}>
          <IconButton size="m" mode="bezeled">
            <IconArrowsExchange size={24} />
          </IconButton>
        </Cell>
        <AssetSelector
          label={t('to')}
          value={toSymbol}
          onChange={setToSymbol}
          items={prices}
        />
        <Input
          header={t('amount')}
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t('amountPlaceholder')}
        />
      </Section>

      <CalculatorResult result={result} toSymbol={toSymbol} items={prices} />
    </List>
  )
}
