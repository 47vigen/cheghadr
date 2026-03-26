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
import { toast } from 'sonner'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { formatIRT } from '@/lib/prices'
import { api } from '@/trpc/react'

export interface AssetEditModalProps {
  assetId: string
  assetName: string
  symbol: string
  quantity: { toString(): string }
  sellPrice: number
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetEditModal({
  assetId,
  assetName,
  symbol,
  quantity,
  sellPrice,
  isOpen,
  onOpenChange,
}: AssetEditModalProps) {
  const t = useTranslations('assets')
  const tPicker = useTranslations('picker')
  const locale = useLocale()

  const isIRT = symbol === 'IRT'

  const [newQuantity, setNewQuantity] = useState(String(quantity))
  const [valueIRT, setValueIRT] = useState('')

  useEffect(() => {
    if (isOpen) {
      const qty = String(quantity)
      setNewQuantity(qty)
      const qtyNum = Number(qty)
      if (sellPrice > 0 && !isIRT && !Number.isNaN(qtyNum)) {
        setValueIRT(String(qtyNum * sellPrice))
      } else {
        setValueIRT('')
      }
    }
  }, [isOpen, quantity, sellPrice, isIRT])

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
      toast.error(err.message || t('toastUpdateError'))
    },
  })

  const handleQuantityChange = (v: string) => {
    setNewQuantity(v)
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
      setNewQuantity('')
    } else if (sellPrice > 0 && !isIRT) {
      setNewQuantity(String(val / sellPrice))
    }
  }

  const handleUpdate = () => {
    const qty = Number(newQuantity)
    if (!newQuantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    updateMutation.mutate({ id: assetId, quantity: newQuantity })
  }

  const priceHint =
    !isIRT && sellPrice > 0
      ? tPicker('priceHint', { price: formatIRT(sellPrice, locale) })
      : null

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container placement="auto" size="md">
          <Modal.Dialog
            className="sm:max-w-[360px]"
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
          >
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {t('editTitle', { name: assetName })}
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="flex flex-col gap-3 p-4">
              {/* Quantity field */}
              <TextField
                value={newQuantity}
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

              {/* Swap divider + value field — only for non-IRT assets */}
              {!isIRT && (
                <>
                  <div className="flex items-center justify-center">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted-foreground/40">
                      <IconArrowsUpDown size={14} />
                    </span>
                  </div>

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
                          {t('tomanAbbr')}
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
                onPress={handleUpdate}
                isDisabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  t('save')
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
