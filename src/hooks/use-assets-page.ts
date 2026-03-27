'use client'

import { useEffect, useMemo, useState } from 'react'

import { toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import type { DeltaWindow } from '@/components/portfolio/portfolio-delta'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'

import { useRouter } from '@/i18n/navigation'
import { downloadCSV } from '@/lib/csv-download'
import {
  REFETCH_ALERTS_MS,
  REFETCH_ASSETS_MS,
  REFETCH_PORTFOLIO_MS,
} from '@/trpc/constants'
import { api } from '@/trpc/react'

export function useAssetsPage() {
  const locale = useLocale()
  const tDelta = useTranslations('delta')
  const tExport = useTranslations('export')
  const router = useRouter()

  // --- UI state ---
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

  // --- Derived constants ---
  const chartTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
    } catch {
      return 'UTC'
    }
  }, [])

  // --- Queries ---
  const settingsQuery = api.user.getSettings.useQuery()

  useEffect(() => {
    if (settingsQuery.data && !settingsQuery.data.isOnboarded) {
      router.replace('/onboard')
    }
  }, [settingsQuery.data, router])

  const portfoliosQuery = api.portfolio.list.useQuery()

  const assetsQuery = api.assets.list.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: REFETCH_ASSETS_MS,
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
      refetchInterval: REFETCH_PORTFOLIO_MS,
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
      refetchInterval: REFETCH_PORTFOLIO_MS,
      refetchOnWindowFocus: true,
    },
  )

  const breakdownQuery = api.portfolio.breakdown.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    {
      refetchInterval: REFETCH_PORTFOLIO_MS,
      refetchOnWindowFocus: true,
    },
  )

  const alertsQuery = api.alerts.list.useQuery(undefined, {
    refetchInterval: REFETCH_ALERTS_MS,
    refetchOnWindowFocus: true,
  })

  const exportQuery = api.portfolio.export.useQuery(
    selectedPortfolioId ? { portfolioId: selectedPortfolioId } : undefined,
    { enabled: false },
  )

  // --- Pull-to-refresh ---
  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([
      assetsQuery.refetch(),
      historyQuery.refetch(),
      biggestMoverQuery.refetch(),
      alertsQuery.refetch(),
      breakdownQuery.refetch(),
    ])
  })

  // --- Keep filters in sync with data ---
  useEffect(() => {
    if (!selectedCategory || !assetsQuery.data) return
    const stillExists = assetsQuery.data.assets.some(
      (a) => a.category === selectedCategory,
    )
    if (!stillExists) setSelectedCategory(null)
  }, [assetsQuery.data, selectedCategory])

  useEffect(() => {
    if (!selectedPortfolioId || !portfoliosQuery.data) return
    const stillExists = portfoliosQuery.data.some(
      (p) => p.id === selectedPortfolioId,
    )
    if (!stillExists) setSelectedPortfolioId(null)
  }, [portfoliosQuery.data, selectedPortfolioId])

  // --- Derived values ---
  const biggestMoverPeriodLabel = useMemo(() => {
    if (deltaWindow === 'ALL') return undefined
    const key = `window${deltaWindow}` as 'window1D' | 'window1W' | 'window1M'
    return tDelta(key)
  }, [deltaWindow, tDelta])

  const filteredAssets = useMemo(() => {
    if (!assetsQuery.data) return []
    if (!selectedCategory) return assetsQuery.data.assets
    return assetsQuery.data.assets.filter(
      (a) => a.category === selectedCategory,
    )
  }, [assetsQuery.data, selectedCategory])

  const selectedCategoryData = useMemo(() => {
    if (!selectedCategory || !breakdownQuery.data) return null
    return (
      breakdownQuery.data.categories.find(
        (c) => c.category === selectedCategory,
      ) ?? null
    )
  }, [selectedCategory, breakdownQuery.data])

  const hasMultiplePortfolios = (portfoliosQuery.data?.length ?? 0) > 1
  const defaultPortfolioId = portfoliosQuery.data?.[0]?.id

  // --- Handlers ---
  const handlePortfolioSelect = (id: string | null) => {
    setSelectedPortfolioId(id)
    setSelectedCategory(null)
  }

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

  const handleRequestDeletePortfolio = () => {
    const p = portfoliosQuery.data?.find((x) => x.id === selectedPortfolioId)
    if (p) {
      setPortfolioToDelete({ id: p.id, name: p.name, assetCount: p.assetCount })
      setShowDeleteModal(true)
    }
  }

  const handleCloseDeleteModal = (open: boolean) => {
    setShowDeleteModal(open)
    if (!open) setPortfolioToDelete(null)
  }

  const handleRefreshStale = () =>
    void Promise.all([
      assetsQuery.refetch(),
      historyQuery.refetch(),
      biggestMoverQuery.refetch(),
      breakdownQuery.refetch(),
    ])

  return {
    // State
    selectedCategory,
    setSelectedCategory,
    selectedPortfolioId,
    deltaWindow,
    setDeltaWindow,
    showCreateModal,
    setShowCreateModal,
    showRenameModal,
    setShowRenameModal,
    showDeleteModal,
    portfolioToDelete,
    // Queries
    assetsQuery,
    historyQuery,
    biggestMoverQuery,
    breakdownQuery,
    alertsQuery,
    exportQuery,
    portfoliosQuery,
    isRefreshing,
    // Derived
    chartTimeZone,
    hasMultiplePortfolios,
    defaultPortfolioId,
    biggestMoverPeriodLabel,
    filteredAssets,
    selectedCategoryData,
    // Handlers
    handlePortfolioSelect,
    handleSettings,
    handleExport,
    handleRequestDeletePortfolio,
    handleCloseDeleteModal,
    handleRefreshStale,
  }
}
