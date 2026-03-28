'use client'

import { useTranslations } from 'next-intl'

import { AssetsAlertSummarySection } from '@/components/assets/assets-alert-summary-section'
import { AssetsBiggestMoverSection } from '@/components/assets/assets-biggest-mover-section'
import { AssetsBreakdownSection } from '@/components/assets/assets-breakdown-section'
import { AssetsChartSection } from '@/components/assets/assets-chart-section'
import { AssetsFab } from '@/components/assets/assets-fab'
import { AssetsHeroSection } from '@/components/assets/assets-hero-section'
import { AssetsListSection } from '@/components/assets/assets-list-section'
import { PageShell } from '@/components/layout/page-shell'
import { PortfolioDeleteDialog } from '@/components/portfolio/portfolio-delete-dialog'
import { PortfolioFormDrawer } from '@/components/portfolio/portfolio-form-drawer'
import { AssetsSkeleton } from '@/components/skeletons/assets-skeleton'
import { ErrorState, RefreshIndicator } from '@/components/ui/async-states'

import { useAssetsPage } from '@/hooks/use-assets-page'

export default function AssetsPage() {
  const t = useTranslations('assets')
  const {
    selectedCategory,
    setSelectedCategory,
    selectedPortfolioId,
    deltaWindow,
    setDeltaWindow,
    portfolioDrawerMode,
    setPortfolioDrawerMode,
    showDeleteModal,
    portfolioToDelete,
    assetsQuery,
    historyQuery,
    biggestMoverQuery,
    breakdownQuery,
    alertsQuery,
    exportQuery,
    portfoliosQuery,
    isRefreshing,
    chartTimeZone,
    defaultPortfolioId,
    biggestMoverPeriodLabel,
    filteredAssets,
    selectedCategoryData,
    handlePortfolioSelect,
    handleSettings,
    handleExport,
    handleRequestDeletePortfolio,
    handleCloseDeleteModal,
    handleRefreshStale,
    handlePortfolioDrawerClose,
  } = useAssetsPage()

  if (assetsQuery.isLoading) {
    return <AssetsSkeleton />
  }

  if (assetsQuery.isError) {
    return (
      <ErrorState
        header={t('loadError')}
        description={assetsQuery.error.message || t('retryButton')}
        retryLabel={t('retryButton')}
        onRetry={() => void assetsQuery.refetch()}
      />
    )
  }

  if (!assetsQuery.data) {
    return <AssetsSkeleton />
  }

  const data = assetsQuery.data

  return (
    <>
      <RefreshIndicator isRefreshing={isRefreshing} />

      <PageShell>
        <AssetsHeroSection
          portfolio={{
            portfolios: portfoliosQuery.data,
            selectedId: selectedPortfolioId,
            onSelect: handlePortfolioSelect,
            onCreate: () => setPortfolioDrawerMode('create'),
            onRename: () => setPortfolioDrawerMode('rename'),
            onDelete: handleRequestDeletePortfolio,
          }}
          prices={{
            totalIRT: data.totalIRT,
            usdSellPrice: data.usdSellPrice,
            eurSellPrice: data.eurSellPrice,
            stale: data.stale,
            snapshotAt: data.snapshotAt,
            onRefresh: handleRefreshStale,
          }}
          delta={{
            window: deltaWindow,
            onChange: setDeltaWindow,
            timezone: chartTimeZone,
          }}
          onSettings={handleSettings}
          onExport={handleExport}
          exportFetching={exportQuery.isFetching}
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

      <AssetsFab
        selectedPortfolioId={selectedPortfolioId}
        defaultPortfolioId={defaultPortfolioId}
      />

      <PortfolioFormDrawer
        isOpen={portfolioDrawerMode !== null}
        onOpenChange={handlePortfolioDrawerClose}
        mode={portfolioDrawerMode ?? 'create'}
        portfolio={
          portfolioDrawerMode === 'rename' && selectedPortfolioId
            ? portfoliosQuery.data?.find((p) => p.id === selectedPortfolioId)
            : undefined
        }
      />

      <PortfolioDeleteDialog
        isOpen={showDeleteModal}
        onOpenChange={handleCloseDeleteModal}
        portfolio={portfolioToDelete}
      />
    </>
  )
}
