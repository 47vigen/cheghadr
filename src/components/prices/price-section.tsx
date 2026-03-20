'use client'

import { useTranslations } from 'next-intl'

import { PriceRow } from '@/components/prices/price-row'
import { Section } from '@/components/ui/section'

import type { PriceItem } from '@/lib/prices'
import { knownCategories } from '@/lib/prices'

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
