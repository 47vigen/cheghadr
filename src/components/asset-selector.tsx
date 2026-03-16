'use client'

import { useState } from 'react'

import {
  Avatar,
  Caption,
  Cell,
  Input,
  List,
  Modal,
  Placeholder,
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
      <Cell
        before={
          current.png ? (
            <Avatar src={current.png} size={40} />
          ) : (
            <Avatar size={40} acronym={current.symbol.slice(0, 2)} />
          )
        }
        subhead={label}
        subtitle={current.symbol}
        onClick={() => setOpen(true)}
      >
        {current.fa}
      </Cell>

      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal()
          else setOpen(true)
        }}
        header={<Modal.Header>{label} — انتخاب دارایی</Modal.Header>}
      >
        <List>
          <Section>
            <Input
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
          </Section>

          {!isSearching && (
            <Section header={categoryLabels.CURRENCY ?? 'ارز'}>
              <Cell
                before={<Avatar size={40} acronym="ت" />}
                subtitle="تومان ایران"
                after={
                  value === 'IRT' ? (
                    <Caption level="2" className="text-tgui-accent-text">
                      ✓
                    </Caption>
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
                        <Caption level="2" className="text-tgui-accent-text">
                          ✓
                        </Caption>
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

          {entries.length === 0 && <Placeholder header="نتیجه‌ای یافت نشد" />}
        </List>
      </Modal>
    </>
  )
}
