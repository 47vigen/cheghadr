'use client'

import { useMemo, useState } from 'react'

import { Input, TextField } from '@heroui/react'
import { IconSearch } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { QuantityModal } from '@/components/assets/quantity-modal'
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
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<PriceItem | null>(null)
  const [quantity, setQuantity] = useState('')

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
      setQuantity('')
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || tAssets('toastAddError'))
    },
  })

  const openModal = (item: PriceItem) => {
    setModalItem(item)
    setQuantity('')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setModalItem(null)
    setQuantity('')
  }

  const handleSave = () => {
    if (!modalItem || addMutation.isPending) return
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(tAssets('toastInvalidQuantity'))
      return
    }
    const sym = getBaseSymbol(modalItem)
    if (!sym || !portfolioId) {
      toast.error(tAssets('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity, portfolioId })
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
            <TextField value={search} onChange={setSearch} fullWidth>
              <Input
                placeholder={t('search')}
                type="search"
                className="py-3"
                dir={locale === 'fa' ? 'rtl' : 'ltr'}
                startContent={
                  <IconSearch size={16} className="text-muted-foreground" />
                }
              />
            </TextField>
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
