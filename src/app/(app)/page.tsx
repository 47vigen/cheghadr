'use client'

import dynamic from 'next/dynamic'

import { Button } from '@heroui/react'
import { IconPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AlertSummaryCard } from '@/components/alerts/alert-summary-card'
import { AssetListItem } from '@/components/asset-list-item'
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
import { api } from '@/trpc/react'

const PortfolioChart = dynamic(
  () =>
    import('@/components/portfolio-chart').then((m) => ({
      default: m.PortfolioChart,
    })),
  { ssr: false, loading: () => <DynamicLoader height={140} /> },
)

export default function AssetsPage() {
  const router = useRouter()
  const t = useTranslations('assets')
  const tNav = useTranslations('nav')
  const tAlerts = useTranslations('alerts')

  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(
    undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  )

  const historyQuery = api.portfolio.history.useQuery(
    { days: 30 },
    { refetchInterval: 30 * 60 * 1000 },
  )

  const alertsQuery = api.alerts.list.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
  })

  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([refetch(), historyQuery.refetch(), alertsQuery.refetch()])
  })

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
            <PortfolioTotal totalIRT={data.totalIRT} />
            <PortfolioDelta />
            {data.stale && (
              <div className="mt-2">
                <StalenessBanner
                  snapshotAt={data.snapshotAt}
                  namespace="assets"
                  onRefresh={() =>
                    void Promise.all([refetch(), historyQuery.refetch()])
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

        {alertsQuery.data !== undefined && (
          <div>
            <Section header={tAlerts('sectionTitle')}>
              <AlertSummaryCard
                activeCount={alertsQuery.data.filter((a) => a.isActive).length}
                triggeredCount={
                  alertsQuery.data.filter((a) => !a.isActive && a.triggeredAt !== null).length
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
              {data.assets.map((asset) => (
                <AssetListItem key={asset.id} {...asset} />
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
          >
            <IconPlus size={18} />
            {t('addAsset')}
          </Button>
        </div>
      )}
    </>
  )
}
