'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  Button,
  Description,
  Drawer,
  Label,
  NumberField,
  Spinner,
} from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { formatIRT } from '@/lib/prices'

const SYNC_DEBOUNCE_MS = 320

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

type LastTouched = 'quantity' | 'value' | null

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

  const lastTouchedRef = useRef<LastTouched>(null)
  const qtyToValueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueToQtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearQtyToValueTimer = useCallback(() => {
    if (qtyToValueTimerRef.current) {
      clearTimeout(qtyToValueTimerRef.current)
      qtyToValueTimerRef.current = null
    }
  }, [])

  const clearValueToQtyTimer = useCallback(() => {
    if (valueToQtyTimerRef.current) {
      clearTimeout(valueToQtyTimerRef.current)
      valueToQtyTimerRef.current = null
    }
  }, [])

  const clearAllTimers = useCallback(() => {
    clearQtyToValueTimer()
    clearValueToQtyTimer()
  }, [clearQtyToValueTimer, clearValueToQtyTimer])

  const syncValueFromQuantity = useCallback(
    (qty: number | undefined) => {
      if (qty === undefined || sellPrice <= 0 || isIRT) {
        setValueIRTNum(undefined)
        return
      }
      setValueIRTNum(Math.round(qty * sellPrice))
    },
    [isIRT, sellPrice],
  )

  const syncQuantityFromValue = useCallback(
    (irt: number | undefined) => {
      if (irt === undefined || sellPrice <= 0 || isIRT) {
        setQuantityNum(undefined)
        return
      }
      const raw = irt / sellPrice
      setQuantityNum(Math.round(raw * 1e8) / 1e8)
    },
    [isIRT, sellPrice],
  )

  /** Quantity to persist when Save runs mid-debounce (state may lag by one frame). */
  const resolveQuantityForSave = useCallback((): number | undefined => {
    clearAllTimers()
    if (isIRT || sellPrice <= 0) return quantityNum
    if (lastTouchedRef.current === 'value' && valueIRTNum !== undefined) {
      const raw = valueIRTNum / sellPrice
      const q = Math.round(raw * 1e8) / 1e8
      setQuantityNum(q)
      setValueIRTNum(Math.round(q * sellPrice))
      return q
    }
    if (lastTouchedRef.current === 'quantity' && quantityNum !== undefined) {
      setValueIRTNum(Math.round(quantityNum * sellPrice))
    }
    return quantityNum
  }, [
    clearAllTimers,
    isIRT,
    quantityNum,
    sellPrice,
    valueIRTNum,
  ])

  useEffect(() => {
    if (!isOpen) {
      clearAllTimers()
      lastTouchedRef.current = null
      return
    }
    lastTouchedRef.current = null
    clearAllTimers()
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
  }, [isOpen, initialQuantity, sellPrice, isIRT, clearAllTimers])

  useEffect(() => () => clearAllTimers(), [clearAllTimers])

  const handleQuantityChange = (num: number | undefined) => {
    lastTouchedRef.current = 'quantity'
    setQuantityNum(num)
    clearQtyToValueTimer()
    clearValueToQtyTimer()
    if (isIRT || sellPrice <= 0) {
      setValueIRTNum(undefined)
      return
    }
    qtyToValueTimerRef.current = setTimeout(() => {
      qtyToValueTimerRef.current = null
      syncValueFromQuantity(num)
    }, SYNC_DEBOUNCE_MS)
  }

  const handleValueChange = (num: number | undefined) => {
    lastTouchedRef.current = 'value'
    setValueIRTNum(num)
    clearQtyToValueTimer()
    clearValueToQtyTimer()
    if (isIRT || sellPrice <= 0) {
      setQuantityNum(undefined)
      return
    }
    valueToQtyTimerRef.current = setTimeout(() => {
      valueToQtyTimerRef.current = null
      syncQuantityFromValue(num)
    }, SYNC_DEBOUNCE_MS)
  }

  const handleSave = () => {
    if (isPending) return
    const qty = resolveQuantityForSave()
    if (qty === undefined || qty <= 0) {
      toast.error(tAssets('toastInvalidQuantity'))
      return
    }
    onSave(String(qty))
  }

  const showDualFields = !isIRT && sellPrice > 0
  const priceHint = showDualFields
    ? tPicker('priceHint', { price: formatIRT(sellPrice, locale) })
    : null

  const fieldGroupClass =
    'number-field__group !inline-flex !h-auto min-h-11 w-full min-w-0 items-stretch ' +
    'overflow-hidden rounded-xl border border-border/80 bg-surface/40 ' +
    'shadow-none transition-colors ' +
    'data-[focus-within]:border-primary/40 data-[focus-within]:bg-surface'

  const inputClass =
    'number-field__input min-h-11 min-w-0 flex-1 bg-transparent py-2.5 ps-3 pe-2 leading-normal'

  const suffixClass =
    'flex max-w-[40%] shrink-0 items-center border-border/50 border-s px-3 ' +
    'font-medium text-muted-foreground text-sm tabular-nums'

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
            <Drawer.Header className="px-4 pt-0 pb-1">
              <Drawer.Heading className="text-balance font-semibold text-base leading-snug">
                {title}
              </Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-4 px-4 py-2">
              <NumberField
                value={quantityNum}
                onChange={handleQuantityChange}
                fullWidth
                variant="secondary"
                minValue={0}
                formatOptions={{
                  maximumFractionDigits: 8,
                  useGrouping: false,
                }}
                autoFocus={autoFocusQuantity}
              >
                <Label className="font-medium">{tPicker('assetAmount')}</Label>
                {priceHint ? (
                  <Description className="mt-0.5 text-foreground/80 text-sm tabular-nums">
                    {priceHint}
                  </Description>
                ) : null}
                {showDualFields ? (
                  <Description className="mt-1 text-muted-foreground text-xs leading-snug">
                    {tPicker('quantitySyncHint')}
                  </Description>
                ) : null}
                <div className="mt-2 min-w-0" dir="ltr">
                  <NumberField.Group className={fieldGroupClass}>
                    <NumberField.Input
                      placeholder="0"
                      className={inputClass}
                    />
                    {symbol ? (
                      <span aria-hidden className={suffixClass}>
                        {symbol}
                      </span>
                    ) : null}
                  </NumberField.Group>
                </div>
              </NumberField>

              {showDualFields ? (
                <NumberField
                  value={valueIRTNum}
                  onChange={handleValueChange}
                  fullWidth
                  variant="secondary"
                  minValue={0}
                  formatOptions={{
                    maximumFractionDigits: 0,
                    useGrouping: true,
                  }}
                >
                  <Label className="font-medium">
                    {tPicker('valueInToman')}
                  </Label>
                  <Description className="mt-0.5 text-muted-foreground text-xs leading-snug">
                    {tPicker('valueSyncHint')}
                  </Description>
                  <div className="mt-2 min-w-0" dir="ltr">
                    <NumberField.Group className={fieldGroupClass}>
                      <NumberField.Input
                        placeholder="0"
                        className={inputClass}
                      />
                      <span aria-hidden className={suffixClass}>
                        {tAssets('tomanAbbr')}
                      </span>
                    </NumberField.Group>
                  </div>
                </NumberField>
              ) : null}
            </Drawer.Body>

            <Drawer.Footer className="border-border/60 border-t bg-background/95 px-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              <Button
                variant="secondary"
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
