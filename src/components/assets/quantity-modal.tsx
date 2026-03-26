'use client'

import { useEffect, useState } from 'react'

import {
  Button,
  InputGroup,
  Label,
  Modal,
  Spinner,
  TextField,
} from '@heroui/react'
import { IconArrowsUpDown } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import type { PriceItem } from '@/lib/prices'
import { formatIRT, getLocalizedItemName } from '@/lib/prices'

interface QuantityModalProps {
  isOpen: boolean
  item: PriceItem | null
  quantity: string
  onQuantityChange: (value: string) => void
  onClose: () => void
  onSave: () => void
  isPending: boolean
}

export function QuantityModal({
  isOpen,
  item,
  quantity,
  onQuantityChange,
  onClose,
  onSave,
  isPending,
}: QuantityModalProps) {
  const tPicker = useTranslations('picker')
  const tAssets = useTranslations('assets')
  const locale = useLocale()

  const sellPrice = Number(item?.sell_price ?? 0)
  const isIRT = item?.symbol === 'IRT'

  // Derived Toman value shown in the second field
  const [valueIRT, setValueIRT] = useState('')

  // Sync valueIRT whenever quantity or item changes (e.g. modal opens with new item)
  useEffect(() => {
    if (!isOpen) return
    const qty = Number(quantity)
    if (quantity === '' || Number.isNaN(qty)) {
      setValueIRT('')
    } else if (sellPrice > 0 && !isIRT) {
      setValueIRT(String(qty * sellPrice))
    }
  }, [quantity, sellPrice, isIRT, isOpen])

  const handleQuantityChange = (v: string) => {
    onQuantityChange(v)
    const qty = Number(v)
    if (v === '' || Number.isNaN(qty)) {
      setValueIRT('')
    } else if (sellPrice > 0 && !isIRT) {
      setValueIRT(String(qty * sellPrice))
    }
  }

  const handleValueChange = (v: string) => {
    setValueIRT(v)
    const val = Number(v)
    if (v === '' || Number.isNaN(val)) {
      onQuantityChange('')
    } else if (sellPrice > 0 && !isIRT) {
      onQuantityChange(String(val / sellPrice))
    }
  }

  const assetName = item ? getLocalizedItemName(item, locale) : ''
  const symbol = item?.base_currency?.symbol ?? item?.symbol ?? ''

  const priceHint =
    !isIRT && sellPrice > 0
      ? tPicker('priceHint', { price: formatIRT(sellPrice, locale) })
      : null

  return (
    <Modal>
      <Modal.Backdrop
        isOpen={isOpen}
        onOpenChange={(v: boolean) => {
          if (!v) onClose()
        }}
      >
        <Modal.Container placement="auto" size="md">
          <Modal.Dialog
            className="sm:max-w-[360px]"
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
          >
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {item
                  ? `${assetName} — ${tPicker('enterQuantity')}`
                  : tPicker('enterQuantity')}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-3 p-4">
              {/* Quantity field */}
              <TextField
                value={quantity}
                onChange={handleQuantityChange}
                fullWidth
                name="quantity"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <Label>{tPicker('assetAmount')}</Label>
                  {priceHint && (
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {priceHint}
                    </span>
                  )}
                </div>
                <InputGroup>
                  <InputGroup.Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    dir="ltr"
                    className="py-3"
                    autoFocus
                  />
                  {symbol && (
                    <InputGroup.Suffix>
                      <span className="font-medium text-muted-foreground text-sm">
                        {symbol}
                      </span>
                    </InputGroup.Suffix>
                  )}
                </InputGroup>
              </TextField>

              {/* Swap divider — only shown for non-IRT assets */}
              {!isIRT && (
                <>
                  <div className="flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground/40">
                      <IconArrowsUpDown size={14} />
                    </span>
                  </div>

                  {/* Toman value field */}
                  <TextField
                    value={valueIRT}
                    onChange={handleValueChange}
                    fullWidth
                    name="valueIRT"
                  >
                    <Label className="mb-1 block">
                      {tPicker('valueInToman')}
                    </Label>
                    <InputGroup>
                      <InputGroup.Input
                        type="number"
                        inputMode="decimal"
                        placeholder="0"
                        dir="ltr"
                        className="py-3"
                      />
                      <InputGroup.Suffix>
                        <span className="font-medium text-muted-foreground text-sm">
                          {tAssets('tomanAbbr')}
                        </span>
                      </InputGroup.Suffix>
                    </InputGroup>
                  </TextField>
                </>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onPress={onSave}
                isDisabled={isPending}
              >
                {isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  tPicker('save')
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
