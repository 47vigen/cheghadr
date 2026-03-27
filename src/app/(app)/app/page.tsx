'use client'

import { useEffect, useMemo, useState } from 'react'

import { toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { AssetsAlertSummarySection } from '@/components/assets/assets-alert-summary-section'
import { AssetsBiggestMoverSection } from '@/components/assets/assets-biggest-mover-section'
import { AssetsBreakdownSection } from '@/components/assets/assets-breakdown-section'
import { AssetsChartSection } from '@/components/assets/assets-chart-section'
import { AssetsFab } from '@/components/assets/assets-fab'
import { AssetsHeroSection } from '@/components/assets/assets-hero-section'
import { AssetsListSection } from '@/components/assets/assets-list-section'
import { PageShell } from '@/components/layout/page-shell'
import { PortfolioDeleteDialog } from '@/components/portfolio/portfolio-delete-dialog'
import type { DeltaWindow } from '@/components/portfolio/portfolio-delta'
import { PortfolioFormModal } from '@/components/portfolio/portfolio-form-modal'
import { AssetsSkeleton } from '@/components/skeletons/assets-skeleton'
import { ErrorState, RefreshIndicator } from '@/components/ui/async-states'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'

import { useRouter } from '@/i18n/navigation'
import { downloadCSV } from '@/lib/csv-download'
import { TRPC_REFETCH_INTERVAL_MS } from '@/trpc/constants'
import { api } from '@/trpc/react'

export default function AssetsPage() {
  const locale = useLocale()
  const t = useTranslations('assets')
  const tDelta = useTranslations('delta')
  const tExport = useTranslations('export')
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(
    null,
  )
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [portfolioToDelete, setPortfolioToDelete] = useState<{
    id: string
    name: string
    assetCount: number
  } | null>(null)
  const [deltaWindow, setDeltaWindow] = useState<DeltaWindow>('1D')

  const chartTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
    } catch {
      return 'UTC'
    }
  }, [])

  const settingsQuery = api.user.getSettings.useQuery()

  useEffect(() => {
    if (settingsQuery.data && !settingsQuery.data.isOnboarded) {
      router.replace('/onboard')
    }
  }, [settingsQuery.data, router])

  const portfoliosQuery = api.portfolio.list.useQuery()

  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    },
  )

  const historyQuery = api.portfolio.history.useQuery(
    selectedPortfolioId
      ? {
          window: deltaWindow,
          timezone: chartTimeZone,
          portfolioId: selectedPortfolioId,
        }
      : { window: deltaWindow, timezone: chartTimeZone },
    {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    },
  )

  const biggestMoverQuery = api.portfolio.biggestMover.useQuery(
    selectedPortfolioId
      ? {
          window: deltaWindow,
          timezone: chartTimeZone,
          portfolioId: selectedPortfolioId,
          locale: locale === 'fa' ? 'fa' : 'en',
        }
      : {
          window: deltaWindow,
          timezone: chartTimeZone,
          locale: locale === 'fa' ? 'fa' : 'en',
        },
    {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    },
  )

  const breakdownQuery = api.portfolio.breakdown.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: TRPC_REFETCH_INTERVAL_MS,
      refetchOnWindowFocus: true,
    },
  )

  const alertsQuery = api.alerts.list.useQuery(undefined, {
    refetchInterval: TRPC_REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: true,
  })

  const exportQuery = api.portfolio.export.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    { enabled: false },
  )

  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([
      refetch(),
      historyQuery.refetch(),
      biggestMoverQuery.refetch(),
      alertsQuery.refetch(),
      breakdownQuery.refetch(),
    ])
  })

  useEffect(() => {
    if (!selectedCategory || !data) return
    const stillExists = data.assets.some((a) => a.category === selectedCategory)
    if (!stillExists) setSelectedCategory(null)
  }, [data, selectedCategory])

  useEffect(() => {
    if (!selectedPortfolioId || !portfoliosQuery.data) return
    const stillExists = portfoliosQuery.data.some(
      (p) => p.id === selectedPortfolioId,
    )
    if (!stillExists) setSelectedPortfolioId(null)
  }, [portfoliosQuery.data, selectedPortfolioId])

  const biggestMoverPeriodLabel = useMemo(() => {
    if (deltaWindow === 'ALL') return undefined
    const key = `window${deltaWindow}` as 'window1D' | 'window1W' | 'window1M'
    return tDelta(key)
  }, [deltaWindow, tDelta])

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

  const handleSettings = () => router.push('/settings')

  const handleExport = async () => {
    const result = await exportQuery.refetch()
    if (result.data && result.data.rowCount > 0) {
      const dateStr =
        new Date().toISOString().split('T')[0]?.replace(/-/g, '') ?? ''
      downloadCSV(result.data.csv, `cheghadr-export-${dateStr}.csv`)
      toast.success(tExport('success', { count: result.data.rowCount }))
    } else {
      toast.info(tExport('empty'))
    }
  }

  const handlePortfolioSelect = (id: string | null) => {
    setSelectedPortfolioId(id)
    setSelectedCategory(null)
  }

  const handleRequestDeletePortfolio = () => {
    const p = portfoliosQuery.data?.find((x) => x.id === selectedPortfolioId)
    if (p) {
      setPortfolioToDelete({
        id: p.id,
        name: p.name,
        assetCount: p.assetCount,
      })
      setShowDeleteModal(true)
    }
  }

  const hasMultiplePortfolios = (portfoliosQuery.data?.length ?? 0) > 1
  const defaultPortfolioId = portfoliosQuery.data?.[0]?.id

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
        <AssetsHeroSection
          portfolios={portfoliosQuery.data}
          hasMultiplePortfolios={hasMultiplePortfolios}
          selectedPortfolioId={selectedPortfolioId}
          onPortfolioSelect={handlePortfolioSelect}
          onCreatePortfolio={() => setShowCreateModal(true)}
          onRenamePortfolio={() => setShowRenameModal(true)}
          onRequestDeletePortfolio={handleRequestDeletePortfolio}
          totalIRT={data.totalIRT}
          usdSellPrice={data.usdSellPrice}
          eurSellPrice={data.eurSellPrice}
          stale={data.stale}
          snapshotAt={data.snapshotAt}
          onRefreshStale={() =>
            void Promise.all([
              refetch(),
              historyQuery.refetch(),
              biggestMoverQuery.refetch(),
              breakdownQuery.refetch(),
            ])
          }
          chartTimeZone={chartTimeZone}
          onSettings={handleSettings}
          onExport={handleExport}
          exportFetching={exportQuery.isFetching}
          deltaWindow={deltaWindow}
          onDeltaWindowChange={setDeltaWindow}
        />

        <AssetsChartSection historyData={historyQuery.data} />

        <AssetsBiggestMoverSection
          biggestMover={biggestMoverQuery.data ?? null}
          periodLabel={biggestMoverPeriodLabel}
        />

        {alertsQuery.data !== undefined && (
          <AssetsAlertSummarySection
            activeCount={alertsQuery.data.filter((a) => a.isActive).length}
            triggeredCount={
              alertsQuery.data.filter(
                (a) => !a.isActive && a.triggeredAt !== null,
              ).length
            }
          />
        )}

        <AssetsBreakdownSection
          breakdownData={breakdownQuery.data ?? undefined}
          assetCount={data.assets.length}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
        />

        <AssetsListSection
          assets={data.assets}
          filteredAssets={filteredAssets}
          totalIRT={data.totalIRT}
          selectedCategory={selectedCategory}
          selectedCategoryData={selectedCategoryData}
          onClearCategory={() => setSelectedCategory(null)}
        />
      </PageShell>

      {data.assets.length > 0 && (
        <AssetsFab
          selectedPortfolioId={selectedPortfolioId}
          defaultPortfolioId={defaultPortfolioId}
        />
      )}

      <PortfolioFormModal
        isOpen={showCreateModal}
        onOpenChange={setShowCreateModal}
        mode="create"
      />

      <PortfolioFormModal
        isOpen={showRenameModal}
        onOpenChange={setShowRenameModal}
        mode="rename"
        portfolio={
          selectedPortfolioId
            ? portfoliosQuery.data?.find((p) => p.id === selectedPortfolioId)
            : undefined
        }
      />

      <PortfolioDeleteDialog
        isOpen={showDeleteModal}
        onOpenChange={(open) => {
          setShowDeleteModal(open)
          if (!open) setPortfolioToDelete(null)
        }}
        portfolio={portfolioToDelete}
      />
    </>
  )
}
