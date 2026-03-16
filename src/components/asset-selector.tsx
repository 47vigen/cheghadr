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
import { useLocale, useTranslations } from 'next-intl'

import {
  filterPriceItems,
  getLocalizedItemName,
  getLocalizedIrtName,
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
  locale: string,
): { symbol: string; displayName: string; png: string | null } {
  if (value === 'IRT')
    return {
      symbol: IRT_ENTRY.symbol,
      displayName: getLocalizedIrtName(locale),
      png: IRT_ENTRY.png,
    }
  const found = items.find((i) => i.base_currency.symbol === value)
  if (!found) return { symbol: value, displayName: value, png: null }
  return {
    symbol: found.base_currency.symbol,
    displayName: getLocalizedItemName(found, locale),
    png: found.png ?? found.base_currency.png ?? null,
  }
}

export function AssetSelector({
  label,
  value,
  onChange,
  items,
}: AssetSelectorProps) {
  const tPicker = useTranslations('picker')
  const tCat = useTranslations('categories')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredItems = filterPriceItems(items, search)
  const grouped = groupByCategory(filteredItems)
  const entries = sortedGroupEntries(grouped)
  const isSearching = search.trim().length > 0

  const current = getCurrentDisplay(value, items, locale)

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
        {current.displayName}
      </Cell>

      <Modal
        open={open}
        onOpenChange={(v) => {
          if (!v) closeModal()
          else setOpen(true)
        }}
        header={
          <Modal.Header>
            {label} — {tPicker('selectAsset')}
          </Modal.Header>
        }
      >
        <List>
          <Section>
            <Input
              placeholder={tPicker('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              type="search"
            />
          </Section>

          {!isSearching && (
            <Section header={tCat('CURRENCY')}>
              <Cell
                before={<Avatar size={40} acronym={IRT_ENTRY.fa.charAt(0)} />}
                subtitle={tPicker('iranianToman')}
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
                {tPicker('toman')}
              </Cell>
            </Section>
          )}

          {entries.map(([category, categoryItems]) => {
            let catLabel: string
            try {
              catLabel = tCat(category as Parameters<typeof tCat>[0])
            } catch {
              catLabel = category
            }
            return (
            <Section
              key={category}
              header={catLabel}
            >
              {categoryItems.map((item) => {
                const icon = item.png ?? item.base_currency.png
                const isSelected = value === item.base_currency.symbol
                const name = getLocalizedItemName(item, locale)
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
                    {name}
                  </Cell>
                )
              })}
            </Section>
            )
          })}

          {entries.length === 0 && (
            <Placeholder header={tPicker('noResults')} />
          )}
        </List>
      </Modal>
    </>
  )
}
