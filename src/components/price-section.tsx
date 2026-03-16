'use client'

import { Section } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { PriceRow } from '@/components/price-row'

import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface PriceSectionProps {
  category: string
  items: PriceItem[]
}

export function PriceSection({ category, items }: PriceSectionProps) {
  const tCat = useTranslations('categories')

  // Cast to known key type; unknown categories fall back to the raw symbol
  let label: string
  try {
    label = tCat(category as Parameters<typeof tCat>[0])
  } catch {
    label = category
  }

  return (
    <Section header={label}>
      {items.map((item) => (
        <PriceRow key={item.symbol} item={item} />
      ))}
    </Section>
  )
}
