'use client'

import { useState } from 'react'

import {
  Avatar,
  Cell,
  Input,
  List,
  Section,
  Spinner,
} from '@telegram-apps/telegram-ui'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import {
  categoryLabels,
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
  const query = search.trim().toLowerCase()

  const filtered = query
    ? items.filter(
        (item) =>
          item.name.fa.includes(query) ||
          item.base_currency.fa.toLowerCase().includes(query) ||
          item.name.en.toLowerCase().includes(query) ||
          item.base_currency.symbol.toLowerCase().includes(query),
      )
    : items

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
    <div className="flex flex-col gap-2">
      <div className="px-4 pt-3">
        <Input
          placeholder="جستجو..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelected(null)
          }}
          type="search"
        />
      </div>

      {selected && (
        <div className="mx-4 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 font-medium text-sm">
            {selected.name.fa} انتخاب شد
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="مقدار را وارد کنید"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-right text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              onClick={handleSave}
              disabled={addMutation.isPending}
              className="shrink-0"
            >
              {addMutation.isPending ? <Spinner size="s" /> : 'ذخیره'}
            </Button>
          </div>
        </div>
      )}

      <List>
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
                      <span className="text-primary text-xs">✓ انتخاب شد</span>
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
          <div className="py-10 text-center text-muted-foreground text-sm">
            نتیجه‌ای یافت نشد
          </div>
        )}
      </List>
    </div>
  )
}
