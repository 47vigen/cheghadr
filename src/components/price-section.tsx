import { Section } from '@telegram-apps/telegram-ui'

import { PriceRow } from '@/components/price-row'

import { categoryLabels } from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface PriceSectionProps {
  category: string
  items: PriceItem[]
}

export function PriceSection({ category, items }: PriceSectionProps) {
  const label = categoryLabels[category] ?? category

  return (
    <Section header={label}>
      {items.map((item) => (
        <PriceRow key={item.symbol} item={item} />
      ))}
    </Section>
  )
}
