'use client'

import { Avatar, Cell, Text } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'

import { ChangeLabel } from '@/components/change-label'

import { formatIRT, getLocalizedItemName } from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface PriceRowProps {
  item: PriceItem
}

export function PriceRow({ item }: PriceRowProps) {
  const locale = useLocale()
  const t = useTranslations('assets')
  const icon = item.png ?? item.base_currency.png
  const name = getLocalizedItemName(item, locale)
  const sellPrice = Number.parseFloat(item.sell_price)

  return (
    <Cell
      before={
        <Avatar
          size={40}
          src={icon ?? undefined}
          acronym={item.base_currency.symbol.slice(0, 2)}
        />
      }
      after={
        <div className="flex flex-col items-end gap-0.5">
          <Text weight="2" className="tabular-nums" dir="ltr">
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
