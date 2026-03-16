'use client'

import { IconPlus } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import {
  Button,
  List,
  Placeholder,
  Section,
  Spinner,
  Text,
} from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { AssetListItem } from '@/components/asset-list-item'
import { DynamicLoader } from '@/components/dynamic-loader'
import { EmptyState } from '@/components/empty-state'
import { PortfolioTotal } from '@/components/portfolio-total'
import { AssetsSkeleton } from '@/components/skeletons/assets-skeleton'
import { StalenessBanner } from '@/components/staleness-banner'

import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { api } from '@/trpc/react'

const PortfolioChart = dynamic(
  () => import('@/components/portfolio-chart').then((m) => ({ default: m.PortfolioChart })),
  { ssr: false, loading: () => <DynamicLoader height={180} /> },
)

export default function AssetsPage() {
  const router = useRouter()
  const t = useTranslations('assets')

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = api.assets.list.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  const historyQuery = api.portfolio.history.useQuery(
    { days: 30 },
    { refetchInterval: 30 * 60 * 1000 },
  )

  const { isRefreshing } = usePullToRefresh(async () => {
    await Promise.all([refetch(), historyQuery.refetch()])
  })

  if (isError) {
    return (
      <Placeholder
        header={t('loadError')}
        description={error.message || t('retryButton')}
        action={
          <Button mode="filled" onClick={() => void refetch()}>
            {t('retryButton')}
          </Button>
        }
      >
        <Text className="text-tgui-hint">⚠️</Text>
      </Placeholder>
    )
  }

  if (isLoading || !data) {
    return <AssetsSkeleton />
  }

  return (
    <>
      {isRefreshing && (
        <div className="flex justify-center py-2">
          <Spinner size="s" />
        </div>
      )}

      <List>
        <Section header={t('totalValue')}>
          <PortfolioTotal totalIRT={data.totalIRT} />
          {data.stale && (
            <StalenessBanner
              snapshotAt={data.snapshotAt}
              namespace="assets"
            />
          )}
        </Section>

        {historyQuery.data && (
          <Section header={t('portfolioChart')}>
            <PortfolioChart data={historyQuery.data} />
          </Section>
        )}

        {data.assets.length === 0 ? (
          <EmptyState />
        ) : (
          <Section header={t('myAssets')}>
            {data.assets.map((asset) => (
              <AssetListItem key={asset.id} {...asset} />
            ))}
          </Section>
        )}
      </List>

      {data.assets.length > 0 && (
        <div className="fixed inset-inline-0 bottom-[var(--bottom-above-tabbar)] z-10 flex justify-center px-4 pb-[var(--bottom-safe)]">
          <Button
            stretched
            mode="filled"
            before={<IconPlus size={18} />}
            onClick={() => router.push('/assets/add')}
          >
            {t('addAsset')}
          </Button>
        </div>
      )}
    </>
  )
}
