'use client'

import { useMemo, useState } from 'react'

import { SearchField, toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { AssetQuantityDrawer } from '@/components/assets/asset-quantity-drawer'
import { PageShell } from '@/components/layout/page-shell'
import { PriceCategoryNav } from '@/components/prices/price-category-nav'
import { PriceSection } from '@/components/prices/price-section'
import { StalenessBanner } from '@/components/prices/staleness-banner'
import { PricesSkeleton } from '@/components/skeletons/prices-skeleton'
import {
  EmptyState,
  ErrorState,
  RefreshIndicator,
} from '@/components/ui/async-states'
import { Section } from '@/components/ui/section'

import { usePriceCategoryScrollSpy } from '@/hooks/use-price-category-scroll-spy'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import type { PriceItem } from '@/lib/prices'
import {
  filterPriceItems,
  getBaseSymbol,
  getLocalizedItemName,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import { priceCategorySectionId } from '@/lib/prices/anchors'
import { TRPC_REFETCH_INTERVAL_MS } from '@/trpc/constants'
import { api } from '@/trpc/react'

export default function PricesPage() {
  const t = useTranslations('prices')
  const tAssets = useTranslations('assets')
  const tPicker = useTranslations('picker')
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<PriceItem | null>(null)

  const { notificationOccurred } = useTelegramHaptics()
  const utils = api.useUtils()

  const portfoliosQuery = api.portfolio.list.useQuery()
  const portfolioId = portfoliosQuery.data?.[0]?.id ?? ''

  const addMutation = api.assets.add.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      toast.success(tAssets('toastAdded'))
      setModalOpen(false)
      setModalItem(null)
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || tAssets('toastAddError'))
    },
  })

  const openModal = (item: PriceItem) => {
    setModalItem(item)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalItem(null)
  }

  const handleSave = (qty: string) => {
    if (!modalItem || addMutation.isPending) return
    const sym = getBaseSymbol(modalItem)
    if (!sym || !portfolioId) {
      toast.danger(tAssets('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity: qty, portfolioId })
  }

  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery(undefined, {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    })

  const filteredPrices = useMemo(() => {
    if (!data?.data) return []
    return filterPriceItems(parsePriceSnapshot(data.data), search)
  }, [data, search])

  const entries = useMemo(() => {
    const grouped = groupByCategory(filteredPrices)
    return sortedGroupEntries(grouped)
  }, [filteredPrices])

  const categoryIds = useMemo(() => entries.map(([c]) => c), [entries])

  const { activeId, scrollToCategory } = usePriceCategoryScrollSpy(categoryIds)

  const { isRefreshing } = usePullToRefresh(async () => {
    await refetch()
  })

  if (isLoading) {
    return <PricesSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        header={t('unavailable')}
        description={error?.message || t('checkLater')}
        retryLabel={tCommon('retry')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data) {
    return (
      <EmptyState header={t('unavailable')} description={t('checkLater')} />
    )
  }

  return (
    <>
      <RefreshIndicator isRefreshing={isRefreshing} />

      <PageShell className="pb-[max(1.5rem,var(--bottom-safe))]">
        <div>
          <Section header={tNav('prices')} variant="hero">
            <SearchField value={search} onChange={setSearch} fullWidth>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input
                  placeholder={t('search')}
                  dir={locale === 'fa' ? 'rtl' : 'ltr'}
                  className="py-3"
                />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            {data?.stale && (
              <div className="mt-2">
                <StalenessBanner
                  snapshotAt={data.snapshotAt}
                  namespace="prices"
                  onRefresh={() => void refetch()}
                />
              </div>
            )}
          </Section>
        </div>

        {entries.length > 0 ? (
          <PriceCategoryNav
            categories={categoryIds}
            activeId={activeId}
            onSelect={scrollToCategory}
          />
        ) : null}

        {entries.length === 0 && search ? (
          <div>
            <EmptyState header={t('noResults')} />
          </div>
        ) : entries.length === 0 ? (
          <div>
            <EmptyState
              header={t('unavailable')}
              description={t('checkLater')}
            />
          </div>
        ) : (
          entries.map(([category, items]) => (
            <div
              key={category}
              id={priceCategorySectionId(category)}
              className="scroll-mt-[4.5rem]"
            >
              <PriceSection
                category={category}
                items={items}
                onPress={openModal}
              />
            </div>
          ))
        )}
      </PageShell>

      <AssetQuantityDrawer
        isOpen={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal()
        }}
        initialQuantity=""
        sellPrice={Number(modalItem?.sell_price ?? 0)}
        isIRT={modalItem?.symbol === 'IRT'}
        symbol={modalItem ? getBaseSymbol(modalItem) : ''}
        title={
          modalItem
            ? `${getLocalizedItemName(modalItem, locale)} — ${tPicker('enterQuantity')}`
            : tPicker('enterQuantity')
        }
        saveLabel={tPicker('save')}
        onSave={handleSave}
        isPending={addMutation.isPending}
        autoFocusQuantity
      />
    </>
  )
}
