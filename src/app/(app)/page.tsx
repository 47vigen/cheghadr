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

import { AssetListItem } from '@/components/asset-list-item'
import { EmptyState } from '@/components/empty-state'
import { PortfolioTotal } from '@/components/portfolio-total'

import { api } from '@/trpc/react'

export default function AssetsPage() {
  const router = useRouter()

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
        header="خطا در بارگذاری"
        description={error.message || 'لطفاً دوباره تلاش کنید'}
        action={
          <Button mode="filled" onClick={() => void refetch()}>
            تلاش مجدد
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
    <div>
      <PortfolioTotal
        totalIRT={data.totalIRT}
        stale={data.stale}
        snapshotAt={data.snapshotAt}
      />

      {data.assets.length === 0 ? (
        <EmptyState />
      ) : (
        <List>
          <Section header="دارایی‌های من">
            {data.assets.map((asset) => (
              <AssetListItem key={asset.id} {...asset} />
            ))}
          </Section>
        </List>
      )}

      {data.assets.length > 0 && (
        <div className="fixed right-0 bottom-[var(--tabbar-height,72px)] left-0 flex justify-center p-4">
          <Button
            mode="filled"
            stretched
            onClick={() => router.push('/assets/add')}
          >
            <IconPlus size={18} />
            افزودن دارایی
          </Button>
        </div>
      )}
    </div>
  )
}
