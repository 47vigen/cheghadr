'use client'

import { useLocale } from 'next-intl'

import type { DeltaWindow } from '@/components/portfolio/portfolio-delta'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'

import {
  REFETCH_ALERTS_MS,
  REFETCH_ASSETS_MS,
  REFETCH_PORTFOLIO_MS,
} from '@/trpc/constants'
import { api } from '@/trpc/react'

interface UseAssetsQueriesOptions {
  selectedPortfolioId: string | null
  deltaWindow: DeltaWindow
  chartTimeZone: string
}

export function useAssetsQueries({
  selectedPortfolioId,
  deltaWindow,
  chartTimeZone,
}: UseAssetsQueriesOptions) {
  const locale = useLocale()

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

  const settingsQuery = api.user.getSettings.useQuery()

  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([
      assetsQuery.refetch(),
      historyQuery.refetch(),
      biggestMoverQuery.refetch(),
      alertsQuery.refetch(),
      breakdownQuery.refetch(),
    ])
  })

  return {
    portfoliosQuery,
    assetsQuery,
    historyQuery,
    biggestMoverQuery,
    breakdownQuery,
    alertsQuery,
    exportQuery,
    settingsQuery,
    isRefreshing,
  }
}
