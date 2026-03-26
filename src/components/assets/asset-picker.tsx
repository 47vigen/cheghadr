'use client'

import { useState } from 'react'

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
  const [quantity, setQuantity] = useState('')

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

  // Derive category list from all groups (unfiltered by category)
  const categoryIds = groups.map((g) => g.category)

  // When searching, show all; otherwise filter by active category
  const visibleGroups =
    search || activeCategory === null
      ? groups
      : groups.filter((g) => g.category === activeCategory)

  const handleSearchChange = (v: string) => {
    setSearch(v)
    // Reset category filter when user starts typing
    if (v) setActiveCategory(null)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalItem(null)
    setQuantity('')
  }

  const openModal = (item: PriceItem) => {
    setModalItem(item)
    setQuantity('')
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!modalItem || addMutation.isPending) return
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    const sym = getBaseSymbol(modalItem)
    if (!sym) {
      toast.error(t('toastAddError'))
      return
    }
    if (!portfolioId) {
      toast.error(t('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity, portfolioId })
  }

  return (
    <>
      {categoryIds.length > 0 && !search && (
        <PriceCategoryNav
          categories={categoryIds}
          activeId={activeCategory ?? categoryIds[0] ?? ''}
          onSelect={(cat) =>
            setActiveCategory(activeCategory === cat ? null : cat)
          }
        />
      )}

      <AssetSearchPanel
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
        wrapSearchInSection
      />

      <QuantityModal
        isOpen={modalOpen}
        item={modalItem}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onClose={closeModal}
        onSave={handleSave}
        isPending={addMutation.isPending}
      />
    </>
  )
}
