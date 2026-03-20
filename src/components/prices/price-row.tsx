'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { ChangeLabel } from '@/components/prices/change-label'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'

import type { PriceItem } from '@/lib/prices'
import { formatIRT, getBaseSymbol, getLocalizedItemName } from '@/lib/prices'

interface PriceRowProps {
  item: PriceItem
}

export function PriceRow({ item }: PriceRowProps) {
  const locale = useLocale()
  const t = useTranslations('assets')
  const icon = item.png ?? item.base_currency?.png
  const name = getLocalizedItemName(item, locale)
  const sellPrice = Number.parseFloat(item.sell_price)

  return (
    <Cell
      before={
        <AssetAvatar alt={name} symbol={getBaseSymbol(item)} src={icon} />
      }
      after={
        <div className="flex flex-col items-end gap-0.5">
          <Text
            className="font-display font-semibold text-sm tabular-nums"
            dir="ltr"
          >
            {Number.isNaN(sellPrice)
              ? '—'
              : `${formatIRT(sellPrice, locale)} ${t('tomanAbbr')}`}
          </Text>
          <ChangeLabel change={item.change} />
        </div>
      }
    >
      {name}
    </Cell>
  )
}
