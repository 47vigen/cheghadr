'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { useTranslations } from 'next-intl'

import { AssetPicker } from '@/components/assets/asset-picker'
import { PageHeader } from '@/components/layout/page-header'
import { PageShell } from '@/components/layout/page-shell'
import { AddAssetSkeleton } from '@/components/skeletons/add-asset-skeleton'
import { EmptyState, ErrorState } from '@/components/ui/async-states'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'

export default function AddAssetPage() {
  const router = useRouter()
  const t = useTranslations('addAsset')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolioId') ?? ''
  useTelegramBackButton(true)

  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery()

  // Also fetch default portfolio if no portfolioId was passed
  const portfoliosQuery = api.portfolio.list.useQuery(undefined, {
    enabled: !portfolioId,
  })

  const ensureDefaultMut = api.portfolio.ensureDefault.useMutation()
  const {
    mutate: ensureDefault,
    reset: resetEnsureDefault,
    isPending: ensureDefaultPending,
    isSuccess: ensureDefaultSuccess,
    isError: ensureDefaultError,
    data: ensuredPortfolio,
    error: ensureDefaultErr,
  } = ensureDefaultMut

  const listLen = portfoliosQuery.data?.length ?? 0

  useEffect(() => {
    if (portfolioId) return
    if (!portfoliosQuery.isSuccess) return
    if (listLen > 0) return
    if (ensureDefaultPending || ensureDefaultSuccess) return
    ensureDefault()
  }, [
    portfolioId,
    portfoliosQuery.isSuccess,
    listLen,
    ensureDefaultPending,
    ensureDefaultSuccess,
    ensureDefault,
  ])

  const resolvedPortfolioId =
    portfolioId || portfoliosQuery.data?.[0]?.id || ensuredPortfolio?.id || ''

  const showPortfolioSkeleton =
    !portfolioId &&
    (portfoliosQuery.isLoading ||
      (portfoliosQuery.isSuccess &&
        listLen === 0 &&
        !ensureDefaultSuccess &&
        !ensureDefaultError))

  if (isLoading || showPortfolioSkeleton) {
    return <AddAssetSkeleton />
  }

  if (!portfolioId && portfoliosQuery.isError) {
    return (
      <ErrorState
        header={t('title')}
        description={portfoliosQuery.error?.message || t('subtitle')}
        retryLabel={tCommon('back')}
        onRetry={() => void portfoliosQuery.refetch()}
      />
    )
  }

  if (ensureDefaultError) {
    return (
      <ErrorState
        header={t('title')}
        description={ensureDefaultErr?.message || t('subtitle')}
        retryLabel={tCommon('back')}
        onRetry={() => {
          resetEnsureDefault()
          ensureDefault()
        }}
      />
    )
  }

  if (isError) {
    return (
      <ErrorState
        header={t('title')}
        description={error?.message || t('subtitle')}
        retryLabel={tCommon('back')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data) {
    return <EmptyState header={t('title')} description={t('subtitle')} />
  }

  return (
    <PageShell>
      <PageHeader
        title={t('title')}
        onBack={() => router.push('/')}
        backLabel={tCommon('back')}
      />
      <div className="px-3 pt-2 pb-1">
        <p className="text-muted-foreground text-xs">{t('subtitle')}</p>
      </div>
      <div>
        <AssetPicker
          priceData={data.data}
          portfolioId={resolvedPortfolioId}
          onSaved={() => router.push('/app')}
        />
      </div>
    </PageShell>
  )
}
