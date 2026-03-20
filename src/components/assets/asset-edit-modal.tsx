'use client'

import { useEffect, useState } from 'react'

import { Button, Input, Label, Modal, Spinner, TextField } from '@heroui/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

export interface AssetEditModalProps {
  assetId: string
  assetName: string
  quantity: { toString(): string }
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetEditModal({
  assetId,
  assetName,
  quantity,
  isOpen,
  onOpenChange,
}: AssetEditModalProps) {
  const t = useTranslations('assets')
  const [newQuantity, setNewQuantity] = useState(String(quantity))

  useEffect(() => {
    if (isOpen) setNewQuantity(String(quantity))
  }, [isOpen, quantity])

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

  const handleUpdate = () => {
    const qty = Number(newQuantity)
    if (!newQuantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    updateMutation.mutate({ id: assetId, quantity: newQuantity })
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {t('editTitle', { name: assetName })}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-4">
              <TextField
                value={newQuantity}
                onChange={setNewQuantity}
                fullWidth
                name="quantity"
              >
                <Label>{t('editQuantityHeader')}</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder={t('editQuantityPlaceholder')}
                />
              </TextField>
              <Button
                variant="primary"
                fullWidth
                onPress={handleUpdate}
                isDisabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  t('save')
                )}
              </Button>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
