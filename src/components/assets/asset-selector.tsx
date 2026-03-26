'use client'

import { useState } from 'react'

import { Modal } from '@heroui/react'
import { IconChevronDown } from '@tabler/icons-react'
import { clsx } from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

import { AssetSearchPanel } from '@/components/assets/asset-search-panel'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

import { useAssetSearchGroups } from '@/hooks/use-asset-search-groups'

import type { PriceItem } from '@/lib/prices'
import {
  getBaseSymbol,
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
  /** When true, removes the border from the trigger cell (for use inside a card) */
  noBorder?: boolean
}

function getCurrentDisplay(
  value: string,
  items: PriceItem[],
  locale: string,
  placeholderLabel: string,
): { symbol: string; displayName: string; png: string | null } {
  if (!value) {
    return { symbol: '', displayName: placeholderLabel, png: null }
  }
  if (value === 'IRT')
    return {
      symbol: IRT_ENTRY.symbol,
      displayName: getLocalizedIrtName(locale),
      png: IRT_ENTRY.png,
    }
  const found = items.find((i) => getBaseSymbol(i) === value)
  if (!found) return { symbol: value, displayName: value, png: null }
  return {
    symbol: getBaseSymbol(found),
    displayName: getLocalizedItemName(found, locale),
    png: found.png ?? found.base_currency?.png ?? null,
  }
}

export function AssetSelector({
  label,
  value,
  onChange,
  items,
  cellClassName,
  noBorder = false,
}: AssetSelectorProps) {
  const tPicker = useTranslations('picker')
  const locale = useLocale()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const groups = useAssetSearchGroups(items, search)

  const current = getCurrentDisplay(value, items, locale, label)

  const closeModal = () => {
    setOpen(false)
    setSearch('')
  }

  const hasSelection = Boolean(value)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs leading-tight">
          {label}
        </span>
        <Cell
          className={clsx(
            'rounded-xl bg-default/40 transition-colors hover:bg-default/55',
            noBorder ? 'px-3' : 'border border-border px-1',
            cellClassName,
          )}
          before={
            <AssetAvatar
              alt={current.displayName}
              symbol={current.symbol || '?'}
              src={current.png}
            />
          }
          subtitle={hasSelection ? current.symbol : undefined}
          after={
            <IconChevronDown
              size={18}
              className="shrink-0 text-muted-foreground"
              aria-hidden
            />
          }
          onClick={() => setOpen(true)}
        >
          <span
            className={clsx(
              !hasSelection && 'font-normal text-muted-foreground',
            )}
          >
            {current.displayName}
          </span>
        </Cell>
      </div>

      <Modal>
        <Modal.Backdrop
          isOpen={open}
          onOpenChange={(v: boolean) => {
            if (!v) closeModal()
            else setOpen(true)
          }}
        >
          <Modal.Container>
            <Modal.Dialog
              className="sm:max-w-[360px]"
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            >
              <Modal.CloseTrigger className="min-h-11 min-w-11" />
              <Modal.Header className="flex flex-col gap-0 pe-2 pt-1 pb-0">
                <Modal.Heading className="text-base leading-snug">
                  {tPicker('selectAsset')}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="max-h-[min(70vh,440px)] overflow-y-auto overflow-x-hidden px-1 pt-0 pb-1">
                <AssetSearchPanel
                  search={search}
                  onSearchChange={setSearch}
                  locale={locale}
                  searchPlaceholder={tPicker('search')}
                  groups={groups}
                  onSelect={(item) => {
                    onChange(getBaseSymbol(item))
                    closeModal()
                  }}
                  getAfter={(item) =>
                    value === getBaseSymbol(item) ? (
                      <span className="text-accent">✓</span>
                    ) : undefined
                  }
                  emptyHeader={tPicker('noResults')}
                  beforeList={
                    !search.trim() ? (
                      <Section
                        header={tPicker('iranianToman')}
                        headerRowClassName="px-4"
                      >
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
