'use client'

import { useEffect, useState } from 'react'

import { Button, Drawer, Label, NumberField, Spinner } from '@heroui/react'
import { IconArrowsUpDown } from '@tabler/icons-react'
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

  // Reset both fields when drawer opens or the asset changes
  useEffect(() => {
    if (!isOpen) return
    setQuantityNum(undefined)
    setValueIRTNum(undefined)
  }, [isOpen])

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
          <Drawer.Dialog dir={locale === 'fa' ? 'rtl' : 'ltr'}>
            <Drawer.Handle />
            <Drawer.Header>
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

            <Drawer.Body className="flex flex-col gap-5 px-4 py-4">
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
                <div className="mt-1 flex items-center gap-2">
                  <NumberField.Group className="flex-1">
                    <NumberField.Input
                      dir="ltr"
                      placeholder="0"
                      className="py-3"
                    />
                  </NumberField.Group>
                  {symbol && (
                    <span className="shrink-0 font-medium text-muted-foreground text-sm">
                      {symbol}
                    </span>
                  )}
                </div>
              </NumberField>

              {/* Swap icon + Toman value — non-IRT only */}
              {!isIRT && (
                <>
                  <div className="flex items-center justify-center">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground/60">
                      <IconArrowsUpDown size={16} />
                    </span>
                  </div>

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
                    <div className="mt-1 flex items-center gap-2">
                      <NumberField.Group className="flex-1">
                        <NumberField.Input
                          dir="ltr"
                          placeholder="0"
                          className="py-3"
                        />
                      </NumberField.Group>
                      <span className="shrink-0 font-medium text-muted-foreground text-sm">
                        {tAssets('tomanAbbr')}
                      </span>
                    </div>
                  </NumberField>
                </>
              )}
            </Drawer.Body>

            <Drawer.Footer>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
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
