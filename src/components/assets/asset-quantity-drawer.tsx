'use client'

import { useEffect } from 'react'

import { Button, Description, Drawer, Label, toast } from '@heroui/react'
import { IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { useForm, useWatch } from 'react-hook-form'

import { NumberInputController } from '@/components/ui/number-input'
import { SubmitButton } from '@/components/ui/submit-button'

import { getDir } from '@/lib/i18n-utils'
import { formatIRT } from '@/lib/prices'
import { isTelegramWebApp } from '@/utils/telegram'

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

type QuantityFormValues = {
  quantity: number | null
  valueIRT: number | null
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

  const initialQty = (() => {
    if (initialQuantity === '') return null
    const qty = Number(initialQuantity)
    return Number.isNaN(qty) ? null : qty
  })()
  const initialValueIRT =
    initialQty !== null && sellPrice > 0 && !isIRT
      ? Math.round(initialQty * sellPrice)
      : null

  const { control, handleSubmit, reset, setValue } =
    useForm<QuantityFormValues>({
      defaultValues: { quantity: initialQty, valueIRT: initialValueIRT },
    })

  // Reset fields when drawer opens / initialQuantity changes
  useEffect(() => {
    if (!isOpen) return
    if (initialQuantity === '') {
      reset({ quantity: null, valueIRT: null })
      return
    }
    const qty = Number(initialQuantity)
    if (Number.isNaN(qty)) {
      reset({ quantity: null, valueIRT: null })
      return
    }
    reset({
      quantity: qty,
      valueIRT: sellPrice > 0 && !isIRT ? Math.round(qty * sellPrice) : null,
    })
  }, [isOpen, initialQuantity, sellPrice, isIRT, reset])

  // Watch quantity to sync valueIRT (quantity → IRT direction)
  const quantityWatched = useWatch({ control, name: 'quantity' })
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only reacts to quantityWatched
  useEffect(() => {
    if (
      isIRT ||
      sellPrice <= 0 ||
      quantityWatched === null ||
      quantityWatched === undefined
    )
      return
    setValue('valueIRT', Math.round(quantityWatched * sellPrice), {
      shouldValidate: false,
    })
  }, [quantityWatched])

  // IRT → quantity direction (called from onChange override)
  const handleValueIRTChange = (num: number | null) => {
    setValue('valueIRT', num, { shouldValidate: false })
    if (isIRT || sellPrice <= 0 || num === null) {
      setValue('quantity', null, { shouldValidate: false })
    } else {
      setValue('quantity', Math.round((num / sellPrice) * 1e8) / 1e8, {
        shouldValidate: false,
      })
    }
  }

  const onSubmit = (data: QuantityFormValues) => {
    if (data.quantity === null || data.quantity <= 0) {
      toast.danger(tAssets('toastInvalidQuantity'))
      return
    }
    onSave(String(data.quantity))
  }

  const showDualFields = !isIRT && sellPrice > 0
  const priceHint = showDualFields
    ? tAddAsset('priceHint', { price: formatIRT(sellPrice, locale) })
    : null

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
            <Drawer.Header className="border-border/40 border-b px-4 pt-0 pb-3">
              <div className="flex flex-row items-center gap-2">
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
              </div>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-4 px-4 py-2">
              <div>
                <Label className="block font-medium text-sm">
                  {tAddAsset('assetAmount')}
                </Label>
                {priceHint ? (
                  <Description className="mt-0.5 text-foreground/80 text-sm tabular-nums">
                    {priceHint}
                  </Description>
                ) : null}
                <NumberInputController
                  name="quantity"
                  control={control}
                  formatOptions={{
                    maximumFractionDigits: 8,
                    useGrouping: true,
                  }}
                  minValue={0}
                  allowNegative={false}
                  placeholder="0"
                  suffix={symbol || undefined}
                  autoFocus={autoFocusQuantity}
                />
              </div>

              {showDualFields ? (
                <div>
                  <Label className="font-medium text-sm">
                    {tAddAsset('valueInToman')}
                  </Label>
                  <NumberInputController
                    name="valueIRT"
                    control={control}
                    formatOptions={{
                      maximumFractionDigits: 0,
                      useGrouping: true,
                    }}
                    minValue={0}
                    allowNegative={false}
                    allowDecimal={false}
                    placeholder="0"
                    suffix={tAssets('tomanAbbr')}
                    onChange={handleValueIRTChange}
                  />
                </div>
              ) : null}
            </Drawer.Body>

            {isTelegramWebApp() ? (
              <SubmitButton
                label={saveLabel}
                isLoading={isPending}
                isDisabled={isPending}
                onPress={() => void handleSubmit(onSubmit)()}
              />
            ) : (
              <Drawer.Footer className="border-border/60 border-t bg-background/95 px-0 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
                <Button
                  variant="secondary"
                  fullWidth
                  size="lg"
                  className="mx-4 rounded-xl font-semibold"
                  onPress={() => void handleSubmit(onSubmit)()}
                  isDisabled={isPending}
                >
                  {saveLabel}
                </Button>
              </Drawer.Footer>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
