'use client'

import { useLocale, useTranslations } from 'next-intl'

import { AssetQuantityDrawer } from '@/components/assets/asset-quantity-drawer'

import type { PriceItem } from '@/lib/prices'
import { getBaseSymbol, getLocalizedItemName } from '@/lib/prices'

interface QuantityModalProps {
  isOpen: boolean
  item: PriceItem | null
  onClose: () => void
  onSave: (quantity: string) => void
  isPending: boolean
}

export function QuantityModal({
  isOpen,
  item,
  onClose,
  onSave,
  isPending,
}: QuantityModalProps) {
  const tPicker = useTranslations('picker')
  const locale = useLocale()

  const sellPrice = Number(item?.sell_price ?? 0)
  const isIRT = item?.symbol === 'IRT'
  const symbol = item ? getBaseSymbol(item) : ''
  const assetName = item ? getLocalizedItemName(item, locale) : ''

  const title = item
    ? `${assetName} — ${tPicker('enterQuantity')}`
    : tPicker('enterQuantity')

  return (
    <AssetQuantityDrawer
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      initialQuantity=""
      sellPrice={sellPrice}
      isIRT={isIRT}
      symbol={symbol}
      title={title}
      saveLabel={tPicker('save')}
      onSave={onSave}
      isPending={isPending}
      autoFocusQuantity
    />
  )
}
