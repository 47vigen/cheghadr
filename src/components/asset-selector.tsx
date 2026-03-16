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
  filterPriceItems,
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

function getCurrentDisplay(
  value: string,
  items: PriceItem[],
): { symbol: string; fa: string; png: string | null } {
  if (value === 'IRT') return IRT_ENTRY
  const found = items.find((i) => i.base_currency.symbol === value)
  if (!found) return { symbol: value, fa: value, png: null }
  return {
    symbol: found.base_currency.symbol,
    fa: found.name.fa || found.base_currency.fa,
    png: found.png ?? found.base_currency.png ?? null,
  }
}

export function AssetSelector({
  label,
  value,
  onChange,
  items,
}: AssetSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredItems = filterPriceItems(items, search)
  const grouped = groupByCategory(filteredItems)
  const entries = sortedGroupEntries(grouped)
  const isSearching = search.trim().length > 0

  const current = getCurrentDisplay(value, items)

  const closeModal = () => {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-right"
        >
          {current.png ? (
            <Avatar src={current.png} size={28} />
          ) : (
            <Avatar size={28} acronym={current.symbol.slice(0, 2)} />
          )}
          <span className="font-medium">{current.fa}</span>
          <span className="mr-auto text-muted-foreground text-xs">
            {current.symbol}
          </span>
        </button>
      </div>

      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal()
          else setOpen(true)
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
            {!isSearching && (
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
                    closeModal()
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
                        closeModal()
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
