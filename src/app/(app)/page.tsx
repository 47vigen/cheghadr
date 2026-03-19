'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@heroui/react'
import { IconPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AlertSummaryCard } from '@/components/alerts/alert-summary-card'
import { AssetListItem } from '@/components/asset-list-item'
import { BiggestMoverCard } from '@/components/biggest-mover-card'
import { CategoryFilterHeader } from '@/components/category-filter-header'
import { DynamicLoader } from '@/components/dynamic-loader'
import { EmptyState } from '@/components/empty-state'
import { PortfolioDelta } from '@/components/portfolio-delta'
import { PortfolioTotal } from '@/components/portfolio-total'
import { AssetsSkeleton } from '@/components/skeletons/assets-skeleton'
import { StalenessBanner } from '@/components/staleness-banner'
import { ErrorState, RefreshIndicator } from '@/components/ui/async-states'
import { PageShell } from '@/components/ui/page-shell'
import { Section } from '@/components/ui/section'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useRouter } from '@/i18n/navigation'
import { computeBiggestMover } from '@/lib/portfolio-utils'
import { api } from '@/trpc/react'

const PortfolioChart = dynamic(
  () =>
    import('@/components/portfolio-chart').then((m) => ({
      default: m.PortfolioChart,
    })),
  { ssr: false, loading: () => <DynamicLoader height={140} /> },
)

const PortfolioBreakdown = dynamic(
  () =>
    import('@/components/portfolio-breakdown').then((m) => ({
      default: m.PortfolioBreakdown,
    })),
  { ssr: false, loading: () => <DynamicLoader height={200} /> },
)

export default function AssetsPage() {
  const router = useRouter()
  const t = useTranslations('assets')
  const tNav = useTranslations('nav')
  const tAlerts = useTranslations('alerts')
  const tBreakdown = useTranslations('breakdown')

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(
    undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  )

  const historyQuery = api.portfolio.history.useQuery(
    { days: 30 },
    { refetchInterval: 30 * 60 * 1000, refetchOnWindowFocus: true },
  )

  const breakdownQuery = api.portfolio.breakdown.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const alertsQuery = api.alerts.list.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([
      refetch(),
      historyQuery.refetch(),
      alertsQuery.refetch(),
      breakdownQuery.refetch(),
    ])
  })

  // Auto-clear filter when the selected category no longer has assets
  useEffect(() => {
    if (!selectedCategory || !data) return
    const stillExists = data.assets.some((a) => a.category === selectedCategory)
    if (!stillExists) setSelectedCategory(null)
  }, [data, selectedCategory])

  const biggestMover = useMemo(
    () => (data ? computeBiggestMover(data.assets) : null),
    [data],
  )

  const filteredAssets = useMemo(() => {
    if (!data) return []
    if (!selectedCategory) return data.assets
    return data.assets.filter((a) => a.category === selectedCategory)
  }, [data, selectedCategory])

  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory || !breakdownQuery.data) return null
    return (
      breakdownQuery.data.categories.find(
        (c) => c.category === selectedCategory,
      ) ?? null
    )
  }, [selectedCategory, breakdownQuery.data])

  if (isError) {
    return (
      <ErrorState
        header={t('loadError')}
        description={error.message || t('retryButton')}
        retryLabel={t('retryButton')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (isLoading || !data) {
    return <AssetsSkeleton />
  }

  return (
    <>
      <RefreshIndicator isRefreshing={isRefreshing} />

      <PageShell>
        <div>
          <Section header={tNav('assets')} variant="hero">
            <PortfolioTotal
              totalIRT={data.totalIRT}
              usdSellPrice={data.usdSellPrice}
              eurSellPrice={data.eurSellPrice}
            />
            <PortfolioDelta />
            {data.stale && (
              <div className="mt-2">
                <StalenessBanner
                  snapshotAt={data.snapshotAt}
                  namespace="assets"
                  onRefresh={() =>
                    void Promise.all([
                      refetch(),
                      historyQuery.refetch(),
                      breakdownQuery.refetch(),
                    ])
                  }
                />
              </div>
            )}
          </Section>
        </div>

        {historyQuery.data && (
          <div>
            <Section header={t('portfolioChart')}>
              <PortfolioChart data={historyQuery.data} />
            </Section>
          </div>
        )}

        {breakdownQuery.data && data.assets.length > 0 && (
          <div>
            <Section header={tBreakdown('title')}>
              <PortfolioBreakdown
                data={breakdownQuery.data.categories}
                totalIRT={breakdownQuery.data.totalIRT}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
              />
            </Section>
          </div>
        )}

        {biggestMover && (
          <div>
            <Section header={tBreakdown('biggestMover')}>
              <BiggestMoverCard {...biggestMover} />
            </Section>
          </div>
        )}

        {alertsQuery.data !== undefined && (
          <div>
            <Section header={tAlerts('sectionTitle')}>
              <AlertSummaryCard
                activeCount={alertsQuery.data.filter((a) => a.isActive).length}
                triggeredCount={
                  alertsQuery.data.filter(
                    (a) => !a.isActive && a.triggeredAt !== null,
                  ).length
                }
                onManage={() => router.push('/alerts')}
              />
            </Section>
          </div>
        )}

        {data.assets.length === 0 ? (
          <div>
            <EmptyState />
          </div>
        ) : (
          <div>
            <Section header={t('assetsList')}>
              {selectedCategory && selectedCategoryData && (
                <CategoryFilterHeader
                  category={selectedCategory}
                  valueIRT={selectedCategoryData.valueIRT}
                  percentage={selectedCategoryData.percentage}
                  onClear={() => setSelectedCategory(null)}
                />
              )}
              {filteredAssets.map((asset) => (
                <AssetListItem
                  key={asset.id}
                  {...asset}
                  portfolioPercentage={
                    selectedCategory && data.totalIRT > 0
                      ? (asset.valueIRT / data.totalIRT) * 100
                      : undefined
                  }
                />
              ))}
            </Section>
          </div>
        )}
      </PageShell>

      {data.assets.length > 0 && (
        <div
          className="fab-shadow fixed start-2 end-2 p-1.5"
          style={{
            bottom: 'calc(var(--bottom-above-tabbar) + var(--bottom-safe))',
          }}
        >
          <Button
            variant="primary"
            fullWidth
            size="sm"
            onPress={() => router.push('/assets/add')}
            className="inline-flex items-center justify-center gap-2"
          >
            <IconPlus size={18} className="shrink-0" aria-hidden />
            {t('addAsset')}
          </Button>
        </div>
      )}
    </>
  )
}
