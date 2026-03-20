'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@heroui/react'
import { IconDownload, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AlertSummaryCard } from '@/components/alerts/alert-summary-card'
import { AssetListItem } from '@/components/asset-list-item'
import { BiggestMoverCard } from '@/components/biggest-mover-card'
import { CategoryFilterHeader } from '@/components/category-filter-header'
import { DynamicLoader } from '@/components/dynamic-loader'
import { EmptyState } from '@/components/empty-state'
import { PortfolioDeleteModal } from '@/components/portfolio-delete-modal'
import { PortfolioFormModal } from '@/components/portfolio-form-modal'
import { PortfolioSelector } from '@/components/portfolio-selector'
import { PortfolioDelta } from '@/components/portfolio-delta'
import { PortfolioTotal } from '@/components/portfolio-total'
import { AssetsSkeleton } from '@/components/skeletons/assets-skeleton'
import { StalenessBanner } from '@/components/staleness-banner'
import { ErrorState, RefreshIndicator } from '@/components/ui/async-states'
import { PageShell } from '@/components/ui/page-shell'
import { Section } from '@/components/ui/section'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { useRouter } from '@/i18n/navigation'
import { downloadCSV } from '@/lib/csv-download'
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
  const locale = useLocale()
  const t = useTranslations('assets')
  const tNav = useTranslations('nav')
  const tAlerts = useTranslations('alerts')
  const tBreakdown = useTranslations('breakdown')
  const tExport = useTranslations('export')

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [portfolioToDelete, setPortfolioToDelete] = useState<{
    id: string
    name: string
    assetCount: number
  } | null>(null)

  const portfoliosQuery = api.portfolio.list.useQuery()

  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  )

  const historyQuery = api.portfolio.history.useQuery(
    selectedPortfolioId
      ? { days: 30, portfolioId: selectedPortfolioId }
      : { days: 30 },
    { refetchInterval: 30 * 60 * 1000, refetchOnWindowFocus: true },
  )

  const breakdownQuery = api.portfolio.breakdown.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  )

  const alertsQuery = api.alerts.list.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
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

  // Reset portfolio selection if the selected portfolio was deleted
  useEffect(() => {
    if (!selectedPortfolioId || !portfoliosQuery.data) return
    const stillExists = portfoliosQuery.data.some((p) => p.id === selectedPortfolioId)
    if (!stillExists) setSelectedPortfolioId(null)
  }, [portfoliosQuery.data, selectedPortfolioId])

  const biggestMover = useMemo(
    () => (data ? computeBiggestMover(data.assets, locale) : null),
    [data, locale],
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

  const handleExport = async () => {
    const result = await exportQuery.refetch()
    if (result.data && result.data.rowCount > 0) {
      const dateStr = new Date().toISOString().split('T')[0]?.replace(/-/g, '') ?? ''
      downloadCSV(result.data.csv, `cheghadr-export-${dateStr}.csv`)
      toast.success(tExport('success', { count: result.data.rowCount }))
    } else {
      toast.info(tExport('empty'))
    }
  }

  const handlePortfolioSelect = (id: string | null) => {
    if (id === null) {
      setSelectedPortfolioId(null)
    } else {
      setSelectedPortfolioId(id)
    }
    setSelectedCategory(null)
  }

  const hasMultiplePortfolios =
    (portfoliosQuery.data?.length ?? 0) > 1

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
        <div>
          <Section
            header={tNav('assets')}
            variant="hero"
            trailing={
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() => void handleExport()}
                isDisabled={exportQuery.isFetching}
                aria-label={tExport('button')}
              >
                <IconDownload size={18} />
              </Button>
            }
          >
            {hasMultiplePortfolios && portfoliosQuery.data && (
              <>
                <PortfolioSelector
                  portfolios={portfoliosQuery.data}
                  selectedId={selectedPortfolioId}
                  onSelect={handlePortfolioSelect}
                  onCreate={() => setShowCreateModal(true)}
                />
                {selectedPortfolioId && (
                  <div className="mb-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-xs"
                      onPress={() => setShowRenameModal(true)}
                    >
                      <IconPencil size={12} aria-hidden />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 gap-1 px-2 text-xs text-destructive"
                      onPress={() => {
                        const p = portfoliosQuery.data?.find(
                          (x) => x.id === selectedPortfolioId,
                        )
                        if (p) {
                          setPortfolioToDelete({
                            id: p.id,
                            name: p.name,
                            assetCount: p.assetCount,
                          })
                          setShowDeleteModal(true)
                        }
                      }}
                    >
                      <IconTrash size={12} aria-hidden />
                    </Button>
                  </div>
                )}
              </>
            )}
            <PortfolioTotal
              totalIRT={data.totalIRT}
              usdSellPrice={data.usdSellPrice}
              eurSellPrice={data.eurSellPrice}
            />
            <PortfolioDelta portfolioId={selectedPortfolioId ?? undefined} />
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
        <>
          <div aria-hidden className="app-main-fab-scroll-spacer" />
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
              onPress={() => {
                const pid = selectedPortfolioId ?? defaultPortfolioId
                if (pid) {
                  router.push(`/assets/add?portfolioId=${pid}`)
                } else {
                  router.push('/assets/add')
                }
              }}
              className="inline-flex items-center justify-center gap-2"
            >
              <IconPlus size={18} className="shrink-0" aria-hidden />
              {t('addAsset')}
            </Button>
          </div>
        </>
      )}

      <PortfolioFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        mode="create"
      />

      <PortfolioFormModal
        isOpen={showRenameModal}
        onClose={() => setShowRenameModal(false)}
        mode="rename"
        portfolio={
          selectedPortfolioId
            ? portfoliosQuery.data?.find((p) => p.id === selectedPortfolioId)
            : undefined
        }
      />

      <PortfolioDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setPortfolioToDelete(null)
        }}
        portfolio={portfolioToDelete}
      />
    </>
  )
}
