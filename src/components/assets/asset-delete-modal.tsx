'use client'

import { Button, Modal, Spinner } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

export interface AssetDeleteModalProps {
  assetId: string
  assetName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetDeleteModal({
  assetId,
  assetName,
  isOpen,
  onOpenChange,
}: AssetDeleteModalProps) {
  const t = useTranslations('assets')
  const locale = useLocale()
  const utils = api.useUtils()
  const { notificationOccurred, impactOccurred } = useTelegramHaptics()

  const deleteMutation = api.assets.delete.useMutation({
    onSuccess: () => {
      impactOccurred('medium')
      void utils.assets.list.invalidate()
      onOpenChange(false)
      toast.success(t('toastDeleted'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastDeleteError'))
    },
  })

  const handleDelete = () => {
    deleteMutation.mutate({ id: assetId })
  }

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
              <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="p-4">
              <p className="text-center text-muted-foreground text-sm">
                {t('deleteConfirm', { name: assetName })}
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                fullWidth
                size="lg"
                onPress={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                fullWidth
                size="lg"
                onPress={handleDelete}
                isDisabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Spinner size="sm" color="current" />
                ) : (
                  t('delete')
                )}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
