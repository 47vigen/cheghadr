'use client'

import { Button, Modal, Spinner } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { api } from '@/trpc/react'

interface PortfolioDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  portfolio: { id: string; name: string; assetCount: number } | null
}

export function PortfolioDeleteModal({
  isOpen,
  onClose,
  portfolio,
}: PortfolioDeleteModalProps) {
  const t = useTranslations('portfolios')
  const locale = useLocale()

  const utils = api.useUtils()

  const deleteMutation = api.portfolio.delete.useMutation({
    onSuccess: () => {
      toast.success(t('toastDeleted'))
      void utils.portfolio.list.invalidate()
      void utils.assets.list.invalidate()
      void utils.portfolio.history.invalidate()
      void utils.portfolio.breakdown.invalidate()
      void utils.portfolio.delta.invalidate()
      onClose()
    },
    onError: (err) => {
      toast.error(err.message || t('toastDeleteError'))
    },
  })

  if (!portfolio) return null

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
              <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4 p-4">
              <p className="text-foreground text-sm">
                {t('deleteConfirm', { count: portfolio.assetCount })}
              </p>
              <p className="mt-1 font-medium text-foreground text-sm">
                &ldquo;{portfolio.name}&rdquo;
              </p>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                onPress={onClose}
                isDisabled={deleteMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                onPress={() => deleteMutation.mutate({ id: portfolio.id })}
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
