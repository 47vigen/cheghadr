'use client'

import { useEffect, useState } from 'react'

import { Button, Drawer, Label, NumberField, Spinner } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { formatIRT } from '@/lib/prices'

export interface AssetQuantityDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  /** When the drawer opens, quantity fields reset from this string (edit) or empty (add). */
  initialQuantity?: string
  sellPrice: number
  isIRT: boolean
  symbol: string
  title: string
  saveLabel: string
  onSave: (quantity: string) => void
  isPending: boolean
  /** Add flow focuses the first field; edit often avoids stealing focus on open. */
  autoFocusQuantity?: boolean
}

export function AssetQuantityDrawer({
  isOpen,
  onOpenChange,
  initialQuantity = '',
  sellPrice,
  isIRT,
  symbol,
  title,
  saveLabel,
  onSave,
  isPending,
  autoFocusQuantity = true,
}: AssetQuantityDrawerProps) {
  const tPicker = useTranslations('picker')
  const tAssets = useTranslations('assets')
  const locale = useLocale()

  const [quantityNum, setQuantityNum] = useState<number | undefined>(undefined)
  const [valueIRTNum, setValueIRTNum] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (!isOpen) return
    if (initialQuantity === '') {
      setQuantityNum(undefined)
      setValueIRTNum(undefined)
      return
    }
    const qty = Number(initialQuantity)
    if (Number.isNaN(qty)) {
      setQuantityNum(undefined)
      setValueIRTNum(undefined)
      return
    }
    setQuantityNum(qty)
    if (sellPrice > 0 && !isIRT) {
      setValueIRTNum(Math.round(qty * sellPrice))
    } else {
      setValueIRTNum(undefined)
    }
  }, [isOpen, initialQuantity, sellPrice, isIRT])

  const handleQuantityChange = (num: number | undefined) => {
    setQuantityNum(num)
    if (num !== undefined && sellPrice > 0 && !isIRT) {
      setValueIRTNum(Math.round(num * sellPrice))
    } else {
      setValueIRTNum(undefined)
    }
  }

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

  const priceHint =
    !isIRT && sellPrice > 0
      ? tPicker('priceHint', { price: formatIRT(sellPrice, locale) })
      : null

  const handleClose = () => onOpenChange(false)

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(v) => {
          if (!v) handleClose()
        }}
      >
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
            className="max-h-[min(92dvh,var(--visual-viewport-height,100dvh)*0.92)] border-border/60 border-t bg-background px-0 pt-3 pb-0 shadow-[0_-8px_32px_oklch(0_0_0/0.12)] sm:max-h-[min(90dvh,var(--visual-viewport-height,100dvh)*0.9)] dark:shadow-[0_-12px_40px_oklch(0_0_0/0.35)]"
          >
            <Drawer.Handle className="mx-auto mb-0.5" />
            <Drawer.Header className="px-4 pt-0 pb-0.5">
              <Drawer.Heading className="text-balance font-semibold text-base leading-snug">
                {title}
              </Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-3 px-4 py-2">
              <NumberField
                value={quantityNum}
                onChange={handleQuantityChange}
                fullWidth
                minValue={0}
                formatOptions={{
                  maximumFractionDigits: 8,
                  useGrouping: false,
                }}
                autoFocus={autoFocusQuantity}
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Label>{tPicker('assetAmount')}</Label>
                  {priceHint ? (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {priceHint}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0 flex min-w-0 items-stretch gap-2">
                  <NumberField.Group className="!grid-cols-[minmax(0,1fr)] !h-auto min-h-11 min-w-0 flex-1 items-center overflow-visible rounded-xl border border-border/80 bg-surface/40 px-1 transition-colors focus-within:border-primary/40 focus-within:bg-surface">
                    <NumberField.Input
                      dir="ltr"
                      placeholder="0"
                      className="min-h-11 bg-transparent py-2.5 leading-normal"
                    />
                  </NumberField.Group>
                  {symbol ? (
                    <span className="max-w-[36%] shrink-0 self-center break-all text-end font-medium text-muted-foreground text-sm">
                      {symbol}
                    </span>
                  ) : null}
                </div>
              </NumberField>

              {!isIRT ? (
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
                  <Label className="mb-1 block">
                    {tPicker('valueInToman')}
                  </Label>
                  <div className="mt-0 flex min-w-0 items-stretch gap-2">
                    <NumberField.Group className="!grid-cols-[minmax(0,1fr)] !h-auto min-h-11 min-w-0 flex-1 items-center overflow-visible rounded-xl border border-border/80 bg-surface/40 px-1 transition-colors focus-within:border-primary/40 focus-within:bg-surface">
                      <NumberField.Input
                        dir="ltr"
                        placeholder="0"
                        className="min-h-11 bg-transparent py-2.5 leading-normal"
                      />
                    </NumberField.Group>
                    <span className="shrink-0 self-center font-medium text-muted-foreground text-sm">
                      {tAssets('tomanAbbr')}
                    </span>
                  </div>
                </NumberField>
              ) : null}
            </Drawer.Body>

            <Drawer.Footer className="border-border/60 border-t bg-background/95 px-0 pt-1.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                className="mx-4 rounded-xl font-semibold"
                onPress={handleSave}
                isDisabled={isPending}
              >
                {isPending ? <Spinner size="sm" color="current" /> : saveLabel}
              </Button>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
