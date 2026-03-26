'use client'

import { useState } from 'react'

import { InputGroup, TextField } from '@heroui/react'
import { IconSearch } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AssetSearchPanel } from '@/components/assets/asset-search-panel'
import { QuantityModal } from '@/components/assets/quantity-modal'
import { PriceCategoryNav } from '@/components/prices/price-category-nav'

import { useAssetSearchGroups } from '@/hooks/use-asset-search-groups'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import type { PriceItem } from '@/lib/prices'
import {
  formatIRT,
  getBaseSymbol,
  makeIrtPriceItem,
  parsePriceSnapshot,
} from '@/lib/prices'
import { api } from '@/trpc/react'

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
  const tPicker = useTranslations('picker')
  const locale = useLocale()

  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<PriceItem | null>(null)

  const utils = api.useUtils()
  const { notificationOccurred } = useTelegramHaptics()

  const addMutation = api.assets.add.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      toast.success(t('toastAdded'))
      closeModal()
      onSaved()
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastAddError'))
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

  const closeModal = () => {
    setModalOpen(false)
    setModalItem(null)
  }

  const openModal = (item: PriceItem) => {
    setModalItem(item)
    setModalOpen(true)
  }

  const handleSave = (qty: string) => {
    if (!modalItem || addMutation.isPending) return
    const sym = getBaseSymbol(modalItem)
    if (!sym) {
      toast.error(t('toastAddError'))
      return
    }
    if (!portfolioId) {
      toast.error(t('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity: qty, portfolioId })
  }

  return (
    <>
      {/* Unified sticky header: search always on top, categories below */}
      <div className="sticky top-0 z-20 -mx-[var(--page-px)] border-border/80 border-b bg-background/90 px-[var(--page-px)] backdrop-blur-md">
        <div className="py-2">
          <TextField value={search} onChange={handleSearchChange} fullWidth>
            <InputGroup>
              <InputGroup.Prefix>
                <IconSearch size={16} className="text-muted-foreground" />
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder={tPicker('search')}
                type="search"
                dir={locale === 'fa' ? 'rtl' : 'ltr'}
                className="py-3 [appearance:textfield] [color-scheme:inherit] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
            </InputGroup>
          </TextField>
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
        searchPlaceholder={tPicker('search')}
        groups={visibleGroups}
        onSelect={openModal}
        getSubtitle={(item) =>
          `${formatIRT(Number(item.sell_price), locale)} ${t('tomanAbbr')}`
        }
        emptyHeader={tPicker('noResults')}
      />

      <QuantityModal
        isOpen={modalOpen}
        item={modalItem}
        onClose={closeModal}
        onSave={handleSave}
        isPending={addMutation.isPending}
      />
    </>
  )
}
