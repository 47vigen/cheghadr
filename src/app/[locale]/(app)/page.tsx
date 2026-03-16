'use client'

import { useRouter } from 'next/navigation'

import { IconPlus } from '@tabler/icons-react'
import {
  Button,
  List,
  Placeholder,
  Section,
  Spinner,
  Text,
} from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { AssetListItem } from '@/components/asset-list-item'
import { EmptyState } from '@/components/empty-state'
import { PortfolioTotal } from '@/components/portfolio-total'

import { api } from '@/trpc/react'

export default function AssetsPage() {
  const router = useRouter()
  const t = useTranslations('assets')

  const { data, isLoading, isError, error, refetch } = api.assets.list.useQuery(
    undefined,
    {
      refetchInterval: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
    },
  )

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
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="l" />
      </div>
    )
  }

  return (
    <>
      <List>
        <Section header={t('totalValue')}>
          <PortfolioTotal totalIRT={data.totalIRT} />
        </Section>

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
