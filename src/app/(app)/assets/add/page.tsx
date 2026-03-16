'use client'

import { useRouter } from 'next/navigation'

import { List, Section, Spinner, Subheadline } from '@telegram-apps/telegram-ui'

import { AssetPicker } from '@/components/asset-picker'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'
import { api } from '@/trpc/react'

export default function AddAssetPage() {
  const router = useRouter()
  useTelegramBackButton(true)

  const { data, isLoading } = api.prices.latest.useQuery()

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="l" />
      </div>
    )
  }

  return (
    <List>
      <Section header="افزودن دارایی">
        <Subheadline level="2" weight="3" className="text-tgui-hint">
          دارایی مورد نظر را جستجو و انتخاب کنید
        </Subheadline>
      </Section>
      <AssetPicker priceData={data?.data} onSaved={() => router.push('/')} />
    </List>
  )
}
