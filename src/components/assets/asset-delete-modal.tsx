'use client'

import { Button, Modal, Spinner, Text } from '@heroui/react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Section } from '@/components/ui/section'

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
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[360px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Section>
                <Text className="mb-4 text-center text-muted-foreground text-sm">
                  {t('deleteConfirm', { name: assetName })}
                </Text>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onPress={() => onOpenChange(false)}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    fullWidth
                    onPress={handleDelete}
                    isDisabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Spinner size="sm" color="current" />
                    ) : (
                      t('delete')
                    )}
                  </Button>
                </div>
              </Section>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
