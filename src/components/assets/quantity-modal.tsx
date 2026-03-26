'use client'

import { useEffect, useState } from 'react'

import { Button, Drawer, Label, NumberField, Spinner } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import type { PriceItem } from '@/lib/prices'
import { formatIRT, getLocalizedItemName } from '@/lib/prices'

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
  const tAssets = useTranslations('assets')
  const locale = useLocale()

  const sellPrice = Number(item?.sell_price ?? 0)
  const isIRT = item?.symbol === 'IRT'

  const [quantityNum, setQuantityNum] = useState<number | undefined>(undefined)
  const [valueIRTNum, setValueIRTNum] = useState<number | undefined>(undefined)

  // Reset both fields when drawer opens or the selected asset changes
  useEffect(() => {
    if (!isOpen) return
    setQuantityNum(undefined)
    setValueIRTNum(undefined)
    // biome-ignore lint/correctness/useExhaustiveDependencies: must clear when `item` changes while open
  }, [isOpen, item])

  // Typing in quantity → update Toman value only
  const handleQuantityChange = (num: number | undefined) => {
    setQuantityNum(num)
    if (num !== undefined && sellPrice > 0 && !isIRT) {
      setValueIRTNum(Math.round(num * sellPrice))
    } else {
      setValueIRTNum(undefined)
    }
  }

  // Typing in Toman → update quantity only
  const handleValueChange = (num: number | undefined) => {
    setValueIRTNum(num)
    if (num !== undefined && sellPrice > 0 && !isIRT) {
      const raw = num / sellPrice
      setQuantityNum(Math.round(raw * 1e8) / 1e8)
    } else {
      setQuantityNum(undefined)
    }
  }

  const handleSave = () => {
    if (isPending) return
    if (quantityNum === undefined || quantityNum <= 0) {
      toast.error(tAssets('toastInvalidQuantity'))
      return
    }
    onSave(String(quantityNum))
  }

  const assetName = item ? getLocalizedItemName(item, locale) : ''
  const symbol = item?.base_currency?.symbol ?? item?.symbol ?? ''

  const priceHint =
    !isIRT && sellPrice > 0
      ? tPicker('priceHint', { price: formatIRT(sellPrice, locale) })
      : null

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(v) => {
          if (!v) onClose()
        }}
      >
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
            className="max-h-[min(92dvh,var(--visual-viewport-height,100dvh)*0.92)] px-0 pt-5 pb-0 sm:max-h-[min(90dvh,var(--visual-viewport-height,100dvh)*0.9)]"
          >
            <Drawer.Handle />
            <Drawer.Header className="px-3">
              <Drawer.Heading>
                {item
                  ? `${assetName} — ${tPicker('enterQuantity')}`
                  : tPicker('enterQuantity')}
              </Drawer.Heading>
              {priceHint && (
                <span className="text-muted-foreground text-xs tabular-nums">
                  {priceHint}
                </span>
              )}
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-5 px-3 py-4">
              {/* Asset quantity */}
              <NumberField
                value={quantityNum}
                onChange={handleQuantityChange}
                fullWidth
                minValue={0}
                formatOptions={{ maximumFractionDigits: 8, useGrouping: false }}
                autoFocus
              >
                <Label>{tPicker('assetAmount')}</Label>
                <div className="mt-1 flex min-w-0 items-stretch gap-2">
                  <NumberField.Group className="!grid-cols-[minmax(0,1fr)] !h-auto min-h-11 min-w-0 flex-1 items-center overflow-visible">
                    <NumberField.Input
                      dir="ltr"
                      placeholder="0"
                      className="min-h-11 py-2.5 leading-normal"
                    />
                  </NumberField.Group>
                  {symbol && (
                    <span className="max-w-[36%] shrink-0 self-center break-all text-end font-medium text-muted-foreground text-sm">
                      {symbol}
                    </span>
                  )}
                </div>
              </NumberField>

              {/* Toman value — non-IRT only (linked to quantity; no swap control) */}
              {!isIRT && (
                <NumberField
                  value={valueIRTNum}
                  onChange={handleValueChange}
                  fullWidth
                  minValue={0}
                  formatOptions={{
                    maximumFractionDigits: 0,
                    useGrouping: true,
                  }}
                >
                  <Label>{tPicker('valueInToman')}</Label>
                  <div className="mt-1 flex min-w-0 items-stretch gap-2">
                    <NumberField.Group className="!grid-cols-[minmax(0,1fr)] !h-auto min-h-11 min-w-0 flex-1 items-center overflow-visible">
                      <NumberField.Input
                        dir="ltr"
                        placeholder="0"
                        className="min-h-11 py-2.5 leading-normal"
                      />
                    </NumberField.Group>
                    <span className="shrink-0 self-center font-medium text-muted-foreground text-sm">
                      {tAssets('tomanAbbr')}
                    </span>
                  </div>
                </NumberField>
              )}
            </Drawer.Body>

            <Drawer.Footer className="px-0">
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                className="rounded-none"
                onPress={handleSave}
                isDisabled={isPending}
              >
                {isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  tPicker('save')
                )}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
