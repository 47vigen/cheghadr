'use client'

import { useEffect, useState } from 'react'

import {
  Button,
  Description,
  Drawer,
  Label,
  NumberField,
  Spinner,
  toast,
} from '@heroui/react'
import { IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import { getDir } from '@/lib/i18n-utils'
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
  /** When provided, a delete button is shown at the bottom of the drawer body. */
  deleteLabel?: string
  onDelete?: () => void
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
  deleteLabel,
  onDelete,
}: AssetQuantityDrawerProps) {
  const tAddAsset = useTranslations('addAsset')
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
    setValueIRTNum(
      sellPrice > 0 && !isIRT ? Math.round(qty * sellPrice) : undefined,
    )
  }, [isOpen, initialQuantity, sellPrice, isIRT])

  const handleQuantityChange = (num: number | undefined) => {
    setQuantityNum(num)
    if (isIRT || sellPrice <= 0 || num === undefined) {
      setValueIRTNum(undefined)
    } else {
      setValueIRTNum(Math.round(num * sellPrice))
    }
  }

  const handleValueChange = (num: number | undefined) => {
    setValueIRTNum(num)
    if (isIRT || sellPrice <= 0 || num === undefined) {
      setQuantityNum(undefined)
    } else {
      setQuantityNum(Math.round((num / sellPrice) * 1e8) / 1e8)
    }
  }

  const handleSave = () => {
    if (isPending) return
    if (quantityNum === undefined || quantityNum <= 0) {
      toast.danger(tAssets('toastInvalidQuantity'))
      return
    }
    onSave(String(quantityNum))
  }

  const showDualFields = !isIRT && sellPrice > 0
  const priceHint = showDualFields
    ? tAddAsset('priceHint', { price: formatIRT(sellPrice, locale) })
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

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(v) => {
          if (!v) onOpenChange(false)
        }}
      >
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            dir={getDir(locale)}
            className="max-h-[min(92dvh,var(--visual-viewport-height,100dvh)*0.92)] border-border/60 border-t bg-background px-0 pt-3 pb-0 shadow-[0_-8px_32px_oklch(0_0_0/0.12)] sm:max-h-[min(90dvh,var(--visual-viewport-height,100dvh)*0.9)] dark:shadow-[0_-12px_40px_oklch(0_0_0/0.35)]"
          >
            <Drawer.Handle className="mx-auto mb-0.5" />
            <Drawer.Header className="flex items-center gap-2 border-border/40 border-b px-4 pt-0 pb-3">
              {onDelete && deleteLabel ? (
                <Button
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-lg text-destructive"
                  onPress={() => {
                    onOpenChange(false)
                    onDelete()
                  }}
                  aria-label={deleteLabel}
                >
                  <IconTrash size={16} aria-hidden />
                </Button>
              ) : null}
              <Drawer.Heading className="flex-1 text-balance font-semibold text-base leading-snug">
                {title}
              </Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-4 px-4 py-2">
              {priceHint ? (
                <Description className="mt-0.5 text-foreground/80 text-sm tabular-nums">
                  {priceHint}
                </Description>
              ) : null}
              <div className={showDualFields ? 'flex flex-row gap-3' : ''}>
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
                  <Label className="font-medium">
                    {tAddAsset('assetAmount')}
                  </Label>
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
                      {tAddAsset('valueInToman')}
                    </Label>
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
              </div>
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
