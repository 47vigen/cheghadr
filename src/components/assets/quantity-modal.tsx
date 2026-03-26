'use client'

import { Button, Input, Modal, Spinner, TextField } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import type { PriceItem } from '@/lib/prices'
import { getLocalizedItemName } from '@/lib/prices'

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
  const locale = useLocale()

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
                  ? `${getLocalizedItemName(item, locale)} — ${tPicker('enterQuantity')}`
                  : tPicker('enterQuantity')}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-4">
              <TextField value={quantity} onChange={onQuantityChange} fullWidth>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={tPicker('enterQuantity')}
                  dir={locale === 'fa' ? 'rtl' : 'ltr'}
                  className="py-3"
                  autoFocus
                />
              </TextField>
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
