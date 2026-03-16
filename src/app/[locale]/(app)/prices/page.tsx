'use client'

import { useState } from 'react'

import { Input, List, Placeholder, Spinner } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { PriceSection } from '@/components/price-section'
import { PricesSkeleton } from '@/components/skeletons/prices-skeleton'
import { StalenessBanner } from '@/components/staleness-banner'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import {
  filterPriceItems,
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import { api } from '@/trpc/react'

export default function PricesPage() {
  const t = useTranslations('prices')
  const [search, setSearch] = useState('')

  const { data, isLoading, refetch } = api.prices.latest.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const { isRefreshing } = usePullToRefresh(async () => {
    await refetch()
  })

  if (isLoading) {
    return <PricesSkeleton />
  }

  const prices = parsePriceSnapshot(data?.data)
  const filtered = filterPriceItems(prices, search)
  const grouped = groupByCategory(filtered)
  const entries = sortedGroupEntries(grouped)

  return (
    <>
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <Spinner size="s" />
        </div>
      )}

      {data?.stale && (
        <StalenessBanner snapshotAt={data.snapshotAt} namespace="prices" />
      )}

      <List>
        <Input
          placeholder={t('search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="search"
        />

        {entries.length === 0 && search ? (
          <Placeholder header={t('noResults')} />
        ) : entries.length === 0 ? (
          <Placeholder
            header={t('unavailable')}
            description={t('checkLater')}
          />
        ) : (
          entries.map(([category, items]) => (
            <PriceSection key={category} category={category} items={items} />
          ))
        )}
      </List>
    </>
  )
}
