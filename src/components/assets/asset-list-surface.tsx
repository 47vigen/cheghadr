'use client'

import type { ReactNode } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import type { PriceItem } from '@/lib/prices'
import {
  getAssetListSubtitle,
  getBaseSymbol,
  getLocalizedItemName,
} from '@/lib/prices'

export interface AssetListGroup {
  category: string
  categoryLabel: string
  items: PriceItem[]
}

interface AssetListSurfaceProps {
  groups: AssetListGroup[]
  onSelect: (item: PriceItem) => void
  getSubtitle?: (item: PriceItem) => string | undefined
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
        <Section
          key={group.category}
          header={group.categoryLabel}
          headerRowClassName="px-4"
        >
          {group.items.map((item) => {
            const icon = item.png ?? item.base_currency?.png
            const name = getLocalizedItemName(item, locale)
            const sym = getBaseSymbol(item)
            const subtitle =
              getSubtitle === undefined
                ? getAssetListSubtitle(item, locale, sym)
                : getSubtitle(item)
            return (
              <Cell
                key={item.symbol}
                before={<AssetAvatar alt={name} symbol={sym} src={icon} />}
                subtitle={subtitle}
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
