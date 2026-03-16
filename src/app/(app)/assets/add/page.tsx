'use client'

import { useRouter } from 'next/navigation'

import {
  Headline,
  List,
  Section,
  Spinner,
  Subheadline,
} from '@telegram-apps/telegram-ui'

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
    <div>
      <List>
        <Section>
          <div className="flex flex-col gap-1 px-4 py-3">
            <Headline weight="2">افزودن دارایی</Headline>
            <Subheadline level="2" weight="3" className="text-tgui-hint">
              دارایی مورد نظر را جستجو و انتخاب کنید
            </Subheadline>
          </div>
        </Section>
      </List>
      <AssetPicker priceData={data?.data} onSaved={() => router.push('/')} />
    </div>
  )
}
