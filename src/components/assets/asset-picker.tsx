'use client'

import { useState } from 'react'

import { SearchField, toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { AssetQuantityDrawer } from '@/components/assets/asset-quantity-drawer'
import { AssetSearchPanel } from '@/components/assets/asset-search-panel'
import { PriceCategoryNav } from '@/components/prices/price-category-nav'

import { useAddAssetMutation } from '@/hooks/use-add-asset-mutation'
import { useAssetSearchGroups } from '@/hooks/use-asset-search-groups'

import { getDir } from '@/lib/i18n-utils'
import type { PriceItem } from '@/lib/prices'
import {
  formatIRT,
  getBaseSymbol,
  getLocalizedItemName,
  makeIrtPriceItem,
  parsePriceSnapshot,
} from '@/lib/prices'

interface AssetPickerProps {
  priceData: unknown
  portfolioId: string
  onSaved: () => void
}

export function AssetPicker({
  priceData,
  portfolioId,
  onSaved,
}: AssetPickerProps) {
  const t = useTranslations('assets')
  const tAddAsset = useTranslations('addAsset')
  const locale = useLocale()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>('CURRENCY')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<PriceItem | null>(null)

  const addMutation = useAddAssetMutation({
    onSuccess: () => {
      setDrawerOpen(false)
      setSelectedItem(null)
      onSaved()
    },
  })

  const items = [makeIrtPriceItem(), ...parsePriceSnapshot(priceData)]
  const groups = useAssetSearchGroups(items, search)

  const categoryIds = groups.map((g) => g.category)

  const visibleGroups =
    search || activeCategory === null
      ? groups
      : groups.filter((g) => g.category === activeCategory)

  const handleSearchChange = (v: string) => {
    setSearch(v)
    if (v) setActiveCategory(null)
  }

  const handleSelect = (item: PriceItem) => {
    setSelectedItem(item)
    setDrawerOpen(true)
  }

  const handleSave = (qty: string) => {
    if (!selectedItem || addMutation.isPending) return
    const sym = getBaseSymbol(selectedItem)
    if (!sym) {
      toast.danger(t('toastAddError'))
      return
    }
    if (!portfolioId) {
      toast.danger(t('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity: qty, portfolioId })
  }

  const sellPrice = Number(selectedItem?.sell_price ?? 0)
  const isIRT = selectedItem?.symbol === 'IRT'
  const symbol = selectedItem ? getBaseSymbol(selectedItem) : ''
  const assetName = selectedItem
    ? getLocalizedItemName(selectedItem, locale)
    : ''
  const drawerTitle = selectedItem
    ? `${assetName} — ${tAddAsset('enterQuantity')}`
    : tAddAsset('enterQuantity')

  return (
    <>
      {/* Unified sticky header: search always on top, categories below */}
      <div className="sticky top-0 z-20 -mx-[var(--page-px)] border-border/80 border-b bg-background/90 px-[var(--page-px)] backdrop-blur-md">
        <div className="py-2">
          <SearchField value={search} onChange={handleSearchChange} fullWidth>
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder={tAddAsset('search')}
                dir={getDir(locale)}
                className="py-3"
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>
        {categoryIds.length > 0 && !search && (
          <PriceCategoryNav
            categories={categoryIds}
            activeId={activeCategory ?? categoryIds[0] ?? ''}
            onSelect={(cat) =>
              setActiveCategory(activeCategory === cat ? null : cat)
            }
            sticky={false}
          />
        )}
      </div>

      <AssetSearchPanel
        hideSearch
        search={search}
        onSearchChange={handleSearchChange}
        locale={locale}
        searchPlaceholder={tAddAsset('search')}
        groups={visibleGroups}
        onSelect={handleSelect}
        getSubtitle={(item) =>
          `${formatIRT(Number(item.sell_price), locale)} ${t('tomanAbbr')}`
        }
        emptyHeader={tAddAsset('noResults')}
      />

      <AssetQuantityDrawer
        isOpen={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setSelectedItem(null)
        }}
        initialQuantity=""
        sellPrice={sellPrice}
        isIRT={isIRT}
        symbol={symbol}
        title={drawerTitle}
        saveLabel={tAddAsset('save')}
        onSave={handleSave}
        isPending={addMutation.isPending}
        autoFocusQuantity
      />
    </>
  )
}
