'use client'

import { useState } from 'react'

import { Input, TextField } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { PageShell } from '@/components/layout/page-shell'
import { PriceSection } from '@/components/prices/price-section'
import { StalenessBanner } from '@/components/prices/staleness-banner'
import { PricesSkeleton } from '@/components/skeletons/prices-skeleton'
import {
  EmptyStateBase,
  ErrorState,
  RefreshIndicator,
} from '@/components/ui/async-states'
import { Section } from '@/components/ui/section'

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
  const tCommon = useTranslations('common')
  const tNav = useTranslations('nav')
  const locale = useLocale()
  const [search, setSearch] = useState('')

  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery(undefined, {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    })

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
      <EmptyStateBase header={t('unavailable')} description={t('checkLater')} />
    )
  }

  const prices = parsePriceSnapshot(data.data)
  const filtered = filterPriceItems(prices, search)
  const grouped = groupByCategory(filtered)
  const entries = sortedGroupEntries(grouped)

  return (
    <>
      <RefreshIndicator isRefreshing={isRefreshing} />

      <PageShell>
        <div>
          <Section header={tNav('prices')} variant="hero">
            <TextField value={search} onChange={setSearch} fullWidth>
              <Input
                placeholder={t('search')}
                type="search"
                dir={locale === 'fa' ? 'rtl' : 'ltr'}
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

        {entries.length === 0 && search ? (
          <div>
            <EmptyStateBase header={t('noResults')} />
          </div>
        ) : entries.length === 0 ? (
          <div>
            <EmptyStateBase
              header={t('unavailable')}
              description={t('checkLater')}
            />
          </div>
        ) : (
          entries.map(([category, items]) => (
            <div key={category}>
              <PriceSection category={category} items={items} />
            </div>
          ))
        )}
      </PageShell>
    </>
  )
}
