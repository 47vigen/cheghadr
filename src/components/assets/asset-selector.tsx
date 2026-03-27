'use client'

import { useState } from 'react'

import { Drawer } from '@heroui/react'
import { IconChevronDown } from '@tabler/icons-react'
import { clsx } from 'clsx'
import { useLocale, useTranslations } from 'next-intl'

import { AssetSearchPanel } from '@/components/assets/asset-search-panel'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

import { useAssetSearchGroups } from '@/hooks/use-asset-search-groups'

import { getDir } from '@/lib/i18n-utils'
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

  const closeDrawer = () => {
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

      <Drawer>
        <Drawer.Backdrop
          isOpen={open}
          onOpenChange={(v) => {
            if (!v) closeDrawer()
          }}
        >
          <Drawer.Content placement="bottom">
            <Drawer.Dialog
              dir={getDir(locale)}
              className="max-h-[min(92dvh,var(--visual-viewport-height,100dvh)*0.92)] border-border/60 border-t bg-background px-0 pt-3 pb-0 shadow-[0_-8px_32px_oklch(0_0_0/0.12)] sm:max-h-[min(90dvh,var(--visual-viewport-height,100dvh)*0.9)] dark:shadow-[0_-12px_40px_oklch(0_0_0/0.35)]"
            >
              <Drawer.Handle className="mx-auto mb-0.5" />
              <Drawer.Header className="px-4 pt-0 pb-1">
                <Drawer.Heading className="font-semibold text-base leading-snug">
                  {tPicker('selectAsset')}
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="overflow-y-auto px-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <AssetSearchPanel
                  search={search}
                  onSearchChange={setSearch}
                  locale={locale}
                  searchPlaceholder={tPicker('search')}
                  groups={groups}
                  onSelect={(item) => {
                    onChange(getBaseSymbol(item))
                    closeDrawer()
                  }}
                  getAfter={(item) =>
                    value === getBaseSymbol(item) ? (
                      <span className="text-accent">✓</span>
                    ) : undefined
                  }
                  emptyHeader={tPicker('noResults')}
                  wrapSearchInSection
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
                            closeDrawer()
                          }}
                        >
                          {tPicker('toman')}
                        </Cell>
                      </Section>
                    ) : null
                  }
                />
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  )
}
