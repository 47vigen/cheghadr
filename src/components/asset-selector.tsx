'use client'

import { useState } from 'react'

import {
  Avatar,
  Cell,
  Input,
  List,
  Modal,
  Section,
} from '@telegram-apps/telegram-ui'

import {
  categoryLabels,
  groupByCategory,
  IRT_ENTRY,
  sortedGroupEntries,
} from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'

interface AssetSelectorProps {
  label: string
  value: string
  onChange: (symbol: string) => void
  items: PriceItem[]
}

export function AssetSelector({
  label,
  value,
  onChange,
  items,
}: AssetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const allItems: Array<{
    symbol: string
    fa: string
    en: string
    png: string | null
    categorySymbol?: string
  }> = [
    { ...IRT_ENTRY, categorySymbol: 'CURRENCY' },
    ...items.map((item) => ({
      symbol: item.base_currency.symbol,
      fa: item.name.fa || item.base_currency.fa,
      en: item.name.en || item.base_currency.en,
      png: item.png ?? item.base_currency.png ?? null,
      categorySymbol: item.base_currency.category?.symbol,
    })),
  ]

  const query = search.trim().toLowerCase()
  const filteredItems = query
    ? items.filter(
        (item) =>
          item.name.fa.includes(query) ||
          item.base_currency.fa.toLowerCase().includes(query) ||
          item.name.en.toLowerCase().includes(query) ||
          item.base_currency.symbol.toLowerCase().includes(query),
      )
    : items

  const grouped = groupByCategory(filteredItems)
  const entries = sortedGroupEntries(grouped)

  const current = allItems.find((i) => i.symbol === value)

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-right"
        >
          {current?.png ? (
            <Avatar src={current.png} size={28} />
          ) : (
            <Avatar size={28} acronym={current?.symbol?.slice(0, 2) ?? '?'} />
          )}
          <span className="font-medium">{current?.fa ?? value}</span>
          <span className="mr-auto text-muted-foreground text-xs">
            {current?.symbol}
          </span>
        </button>
      </div>

      <Modal
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setSearch('')
        }}
        header={<Modal.Header>{label} — انتخاب دارایی</Modal.Header>}
      >
        <div className="flex flex-col gap-2 pb-6">
          <div className="px-4 pt-2">
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
          </div>

          <List>
            {/* IRT entry only when not searching */}
            {!query && (
              <Section header={categoryLabels.CURRENCY ?? 'ارز'}>
                <Cell
                  before={<Avatar size={40} acronym="ت" />}
                  subtitle="تومان ایران"
                  after={
                    value === 'IRT' ? (
                      <span className="text-primary text-xs">✓</span>
                    ) : undefined
                  }
                  onClick={() => {
                    onChange('IRT')
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  تومان
                </Cell>
              </Section>
            )}

            {entries.map(([category, categoryItems]) => (
              <Section
                key={category}
                header={categoryLabels[category] ?? category}
              >
                {categoryItems.map((item) => {
                  const icon = item.png ?? item.base_currency.png
                  const isSelected = value === item.base_currency.symbol
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
                      subtitle={item.base_currency.en}
                      after={
                        isSelected ? (
                          <span className="text-primary text-xs">✓</span>
                        ) : undefined
                      }
                      onClick={() => {
                        onChange(item.base_currency.symbol)
                        setOpen(false)
                        setSearch('')
                      }}
                    >
                      {item.name.fa || item.base_currency.fa}
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
      </Modal>
    </>
  )
}
