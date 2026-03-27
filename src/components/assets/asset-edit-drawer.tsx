'use client'

import { toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { AssetQuantityDrawer } from '@/components/assets/asset-quantity-drawer'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

export interface AssetEditDrawerProps {
  assetId: string
  assetName: string
  symbol: string
  quantity: { toString(): string }
  sellPrice: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetEditDrawer({
  assetId,
  assetName,
  symbol,
  quantity,
  sellPrice,
  isOpen,
  onOpenChange,
}: AssetEditDrawerProps) {
  const t = useTranslations('assets')

  const utils = api.useUtils()
  const { notificationOccurred } = useTelegramHaptics()

  const updateMutation = api.assets.update.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      onOpenChange(false)
      toast.success(t('toastUpdated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastUpdateError'))
    },
  })

  const isIRT = symbol === 'IRT'

  return (
    <AssetQuantityDrawer
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      initialQuantity={String(quantity)}
      sellPrice={sellPrice}
      isIRT={isIRT}
      symbol={symbol}
      title={t('editTitle', { name: assetName })}
      saveLabel={t('save')}
      onSave={(qty) => updateMutation.mutate({ id: assetId, quantity: qty })}
      isPending={updateMutation.isPending}
      autoFocusQuantity={false}
    />
  )
}
