'use client'

import { List, Placeholder, Spinner } from '@telegram-apps/telegram-ui'

import { PriceSection } from '@/components/price-section'
import { StalenessBadge } from '@/components/staleness-badge'

import {
  groupByCategory,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import { api } from '@/trpc/react'

export default function PricesPage() {
  const { data, isLoading } = api.prices.latest.useQuery(undefined, {
    refetchInterval: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="l" />
      </div>
    )
  }

  const prices = parsePriceSnapshot(data?.data)
  const grouped = groupByCategory(prices)
  const entries = sortedGroupEntries(grouped)

  return (
    <div>
      <div className="px-4 py-3">
        <StalenessBadge
          snapshotAt={data?.snapshotAt ?? null}
          stale={data?.stale ?? true}
        />
      </div>

      {entries.length === 0 ? (
        <Placeholder
          header="قیمت‌ها در دسترس نیست"
          description="لطفاً بعداً دوباره بررسی کنید"
        />
      ) : (
        <List>
          {entries.map(([category, items]) => (
            <PriceSection key={category} category={category} items={items} />
          ))}
        </List>
      )}
    </div>
  )
}
