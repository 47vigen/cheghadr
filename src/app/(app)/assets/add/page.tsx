'use client'

import { useSearchParams } from 'next/navigation'

import { Button } from '@heroui/react'
import { IconArrowLeft } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AssetPicker } from '@/components/assets/asset-picker'
import { PageShell } from '@/components/layout/page-shell'
import { AddAssetSkeleton } from '@/components/skeletons/add-asset-skeleton'
import { EmptyStateBase, ErrorState } from '@/components/ui/async-states'
import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'
import { isTelegramWebApp } from '@/utils/telegram'

export default function AddAssetPage() {
  const router = useRouter()
  const t = useTranslations('addAsset')
  const searchParams = useSearchParams()
  const portfolioId = searchParams.get('portfolioId') ?? ''
  useTelegramBackButton(true)
  const inTelegram = isTelegramWebApp()

  const { data, isLoading, isError, error, refetch } =
    api.prices.latest.useQuery()

  // Also fetch default portfolio if no portfolioId was passed
  const portfoliosQuery = api.portfolio.list.useQuery(undefined, {
    enabled: !portfolioId,
  })

  const resolvedPortfolioId =
    portfolioId || (portfoliosQuery.data?.[0]?.id ?? '')

  if (isLoading || (!portfolioId && portfoliosQuery.isLoading)) {
    return <AddAssetSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        header={t('title')}
        description={error?.message || t('subtitle')}
        retryLabel={t('back')}
        onRetry={() => void refetch()}
      />
    )
  }

  if (!data) {
    return <EmptyStateBase header={t('title')} description={t('subtitle')} />
  }

  return (
    <PageShell>
      {!inTelegram && (
        <div>
          <Section>
            <Cell
              before={
                <Button
                  isIconOnly
                  variant="ghost"
                  size="md"
                  aria-label={t('back')}
                  onPress={() => router.push('/')}
                >
                  <IconArrowLeft size={24} />
                </Button>
              }
            >
              {t('title')}
            </Cell>
          </Section>
        </div>
      )}
      <div>
        <Section header={inTelegram ? t('title') : undefined}>
          <p className="px-2 py-0.5 text-muted-foreground text-xs">
            {t('subtitle')}
          </p>
        </Section>
      </div>
      <div>
        <AssetPicker
          priceData={data.data}
          portfolioId={resolvedPortfolioId}
          onSaved={() => router.push('/')}
        />
      </div>
    </PageShell>
  )
}
