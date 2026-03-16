'use client'

import { useState } from 'react'

import { IconArrowsExchange } from '@tabler/icons-react'
import {
  IconButton,
  Input,
  List,
  Section,
  Spinner,
} from '@telegram-apps/telegram-ui'

import { AssetSelector } from '@/components/asset-selector'
import { CalculatorResult } from '@/components/calculator-result'

import { computeConversion, parsePriceSnapshot } from '@/lib/prices'
import { api } from '@/trpc/react'

export default function CalculatorPage() {
  const { data, isLoading } = api.prices.latest.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const [fromSymbol, setFromSymbol] = useState('USD')
  const [toSymbol, setToSymbol] = useState('IRT')
  const [amount, setAmount] = useState('')

  const prices = parsePriceSnapshot(data?.data)

  const result = amount
    ? computeConversion(amount, fromSymbol, toSymbol, prices)
    : null

  const handleSwap = () => {
    setFromSymbol(toSymbol)
    setToSymbol(fromSymbol)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="l" />
      </div>
    )
  }

  return (
    <List>
      <Section header="ماشین حساب">
        <AssetSelector
          label="از"
          value={fromSymbol}
          onChange={setFromSymbol}
          items={prices}
        />
        <Input
          header="مقدار"
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="مقدار را وارد کنید"
        />
        <div className="flex justify-center py-2">
          <IconButton size="m" mode="bezeled" onClick={handleSwap}>
            <IconArrowsExchange size={24} />
          </IconButton>
        </div>
        <AssetSelector
          label="به"
          value={toSymbol}
          onChange={setToSymbol}
          items={prices}
        />
      </Section>

      <CalculatorResult result={result} toSymbol={toSymbol} items={prices} />
    </List>
  )
}
