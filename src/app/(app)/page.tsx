'use client'

import { useRouter } from 'next/navigation'

import { IconPlus } from '@tabler/icons-react'
import { List, Section, Spinner } from '@telegram-apps/telegram-ui'

import { AssetListItem } from '@/components/asset-list-item'
import { EmptyState } from '@/components/empty-state'
import { PortfolioTotal } from '@/components/portfolio-total'
import { Button } from '@/components/ui/button'

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
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm">{error.message || 'خطا در بارگذاری'}</p>
        <Button onClick={() => void refetch()}>تلاش مجدد</Button>
      </div>
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
            onClick={() => router.push('/assets/add')}
            className="w-full max-w-sm shadow-lg"
          >
            <IconPlus size={18} />
            افزودن دارایی
          </Button>
        </div>
      )}
    </div>
  )
}
