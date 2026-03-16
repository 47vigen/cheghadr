'use client'

import { Section } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { PriceRow } from '@/components/price-row'

import { knownCategories } from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface PriceSectionProps {
  category: string
  items: PriceItem[]
}

export function PriceSection({ category, items }: PriceSectionProps) {
  const tCat = useTranslations('categories')
  const label = knownCategories.has(category)
    ? tCat(category as Parameters<typeof tCat>[0])
    : category

  return (
    <Section header={label}>
      {items.map((item) => (
        <PriceRow key={item.symbol} item={item} />
      ))}
    </Section>
  )
}
