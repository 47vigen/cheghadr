'use client'

import type { ReactNode } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import type { PriceItem } from '@/lib/prices'
import { getBaseSymbol, getLocalizedItemName } from '@/lib/prices'

interface AssetListGroup {
  category: string
  categoryLabel: string
  items: PriceItem[]
}

interface AssetListSurfaceProps {
  groups: AssetListGroup[]
  onSelect: (item: PriceItem) => void
  getSubtitle?: (item: PriceItem) => string
  getAfter?: (item: PriceItem) => ReactNode
  emptyHeader: string
}

export function AssetListSurface({
  groups,
  onSelect,
  getSubtitle,
  getAfter,
  emptyHeader,
}: AssetListSurfaceProps) {
  const locale = useLocale()
  const tPicker = useTranslations('picker')

  return (
    <>
      {groups.map((group) => (
        <Section key={group.category} header={group.categoryLabel}>
          {group.items.map((item) => {
            const icon = item.png ?? item.base_currency?.png
            const name = getLocalizedItemName(item, locale)
            return (
              <Cell
                key={item.symbol}
                before={
                  <AssetAvatar
                    alt={name}
                    symbol={getBaseSymbol(item)}
                    src={icon}
                  />
                }
                subtitle={getSubtitle?.(item)}
                after={getAfter?.(item)}
                onClick={() => onSelect(item)}
              >
                {name}
              </Cell>
            )
          })}
        </Section>
      ))}

      {groups.length === 0 ? (
        <Section>
          <Placeholder header={emptyHeader || tPicker('noResults')} />
        </Section>
      ) : null}
    </>
  )
}
