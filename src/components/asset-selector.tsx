'use client'

import { useState } from 'react'

import { Modal } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { AssetSearchPanel } from '@/components/asset-search-panel'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'
import { useAssetSearchGroups } from '@/components/use-asset-search-groups'

import type { PriceItem } from '@/lib/prices'
import {
  getLocalizedIrtName,
  getLocalizedItemName,
  IRT_ENTRY,
} from '@/lib/prices'

interface AssetSelectorProps {
  label: string
  value: string
  onChange: (symbol: string) => void
  items: PriceItem[]
  cellClassName?: string
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
  cellClassName,
}: AssetSelectorProps) {
  const tPicker = useTranslations('picker')
  const tCat = useTranslations('categories')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const groups = useAssetSearchGroups(items, search)

  const current = getCurrentDisplay(value, items, locale)

  const closeModal = () => {
    setOpen(false)
    setSearch('')
  }

  return (
    <>
      <Cell
        className={cellClassName}
        before={
          <AssetAvatar
            alt={current.displayName}
            symbol={current.symbol}
            src={current.png}
          />
        }
        subhead={label}
        subtitle={current.symbol}
        onClick={() => setOpen(true)}
      >
        {current.displayName}
      </Cell>

      <Modal>
        <Modal.Backdrop
          isOpen={open}
          onOpenChange={(v: boolean) => {
            if (!v) closeModal()
            else setOpen(true)
          }}
        >
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {label} — {tPicker('selectAsset')}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <AssetSearchPanel
                  search={search}
                  onSearchChange={setSearch}
                  locale={locale}
                  searchPlaceholder={tPicker('search')}
                  groups={groups}
                  onSelect={(item) => {
                    onChange(item.base_currency.symbol)
                    closeModal()
                  }}
                  getSubtitle={(item) => item.base_currency.en}
                  getAfter={(item) =>
                    value === item.base_currency.symbol ? (
                      <span className="text-accent">✓</span>
                    ) : undefined
                  }
                  emptyHeader={tPicker('noResults')}
                  beforeList={
                    !search.trim() ? (
                      <Section header={tCat('CURRENCY')}>
                        <Cell
                          before={
                            <AssetAvatar
                              alt={tPicker('toman')}
                              symbol={
                                locale === 'fa'
                                  ? IRT_ENTRY.fa.charAt(0)
                                  : IRT_ENTRY.en.slice(0, 2)
                              }
                            />
                          }
                          after={
                            value === 'IRT' ? (
                              <span className="text-accent">✓</span>
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
                    ) : null
                  }
                />
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
