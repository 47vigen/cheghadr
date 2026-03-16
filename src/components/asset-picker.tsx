'use client'

import { useState } from 'react'

import {
  Avatar,
  Button,
  Caption,
  Cell,
  Input,
  Placeholder,
  Section,
  Spinner,
} from '@telegram-apps/telegram-ui'
import { toast } from 'sonner'

import {
  categoryLabels,
  filterPriceItems,
  formatIRT,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'
import { api } from '@/trpc/react'

interface AssetPickerProps {
  priceData: unknown
  onSaved: () => void
}

export function AssetPicker({ priceData, onSaved }: AssetPickerProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PriceItem | null>(null)
  const [quantity, setQuantity] = useState('')

  const utils = api.useUtils()

  const addMutation = api.assets.add.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate()
      toast.success('دارایی اضافه شد')
      onSaved()
    },
    onError: (err) => toast.error(err.message || 'خطا در افزودن'),
  })

  const items = parsePriceSnapshot(priceData)
  const filtered = filterPriceItems(items, search)
  const grouped = groupByCategory(filtered)
  const entries = sortedGroupEntries(grouped)

  const handleSave = () => {
    if (!selected) return
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error('مقدار باید عددی مثبت باشد')
      return
    }
    addMutation.mutate({ symbol: selected.base_currency.symbol, quantity })
  }

  return (
    <>
      <Section>
        <Input
          placeholder="جستجو..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelected(null)
          }}
          type="search"
        />
      </Section>

      {selected && (
        <Section header={`${selected.name.fa} انتخاب شد`}>
          <Input
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="مقدار را وارد کنید"
          />
          <Button
            mode="filled"
            stretched
            onClick={handleSave}
            disabled={addMutation.isPending}
          >
            {addMutation.isPending ? <Spinner size="s" /> : 'ذخیره'}
          </Button>
        </Section>
      )}

      {entries.map(([category, categoryItems]) => (
        <Section key={category} header={categoryLabels[category] ?? category}>
          {categoryItems.map((item) => {
            const icon = item.png ?? item.base_currency.png
            const isSelected =
              selected?.base_currency.symbol === item.base_currency.symbol
            return (
              <Cell
                key={item.symbol}
                before={
                  icon ? (
                    <Avatar src={icon} size={40} />
                  ) : (
                    <Avatar
                      size={40}
                      acronym={item.base_currency.symbol.slice(0, 2)}
                    />
                  )
                }
                subtitle={`${formatIRT(Number(item.sell_price))} ت`}
                after={
                  isSelected ? (
                    <Caption level="2" className="text-tgui-accent-text">
                      ✓ انتخاب شد
                    </Caption>
                  ) : undefined
                }
                onClick={() => {
                  setSelected(isSelected ? null : item)
                  setQuantity('')
                }}
              >
                {item.name.fa}
              </Cell>
            )
          })}
        </Section>
      ))}

      {entries.length === 0 && (
        <Section>
          <Placeholder header="نتیجه‌ای یافت نشد" />
        </Section>
      )}
    </>
  )
}
