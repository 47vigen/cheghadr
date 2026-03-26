'use client'

import { Button, Modal, Spinner } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { api } from '@/trpc/react'
import type { PortfolioListItem } from '@/types/api'

interface PortfolioDeleteModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  portfolio: Pick<PortfolioListItem, 'id' | 'name' | 'assetCount'> | null
}

export function PortfolioDeleteModal({
  isOpen,
  onOpenChange,
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
      void utils.portfolio.biggestMover.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message || t('toastDeleteError'))
    },
  })

  if (!portfolio) return null

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
                size="lg"
                onPress={() => onOpenChange(false)}
                isDisabled={deleteMutation.isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                size="lg"
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
