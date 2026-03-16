'use client'

import { useRouter } from 'next/navigation'

import { Spinner } from '@telegram-apps/telegram-ui'

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
    <div className="pb-6">
      <div className="border-border border-b px-4 py-3">
        <h1 className="font-semibold text-base">افزودن دارایی</h1>
        <p className="mt-0.5 text-muted-foreground text-xs">
          دارایی مورد نظر را جستجو و انتخاب کنید
        </p>
      </div>
      <AssetPicker priceData={data?.data} onSaved={() => router.push('/')} />
    </div>
  )
}
