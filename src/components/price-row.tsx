import { Avatar, Cell, Text } from '@telegram-apps/telegram-ui'

import { ChangeLabel } from '@/components/change-label'

import { formatIRT } from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface PriceRowProps {
  item: PriceItem
}

export function PriceRow({ item }: PriceRowProps) {
  const icon = item.png ?? item.base_currency.png
  const name = item.name.fa || item.base_currency.fa
  const sellPrice = Number.parseFloat(item.sell_price)

  return (
    <Cell
      before={
        icon ? (
          <Avatar src={icon} size={40} />
        ) : (
          <Avatar size={40} acronym={item.base_currency.symbol.slice(0, 2)} />
        )
      }
      after={
        <div className="flex flex-col items-end gap-0.5">
          <Text weight="2" className="tabular-nums" dir="ltr">
            {Number.isNaN(sellPrice) ? '—' : `${formatIRT(sellPrice)} ت`}
          </Text>
          <ChangeLabel change={item.change} />
        </div>
      }
    >
      {name}
    </Cell>
  )
}
