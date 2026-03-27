'use client'

import { AlertDialog, Button, Spinner, toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { api } from '@/trpc/react'
import type { PortfolioListItem } from '@/types/api'

interface PortfolioDeleteDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  portfolio: Pick<PortfolioListItem, 'id' | 'name' | 'assetCount'> | null
}

export function PortfolioDeleteDialog({
  isOpen,
  onOpenChange,
  portfolio,
}: PortfolioDeleteDialogProps) {
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
      toast.danger(err.message || t('toastDeleteError'))
    },
  })

  if (!portfolio) return null

  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container placement="auto" size="sm">
        <AlertDialog.Dialog
          className="sm:max-w-[360px]"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        >
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{t('deleteTitle')}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body className="flex flex-col gap-4">
            <p className="text-foreground text-sm">
              {t('deleteConfirm', { count: portfolio.assetCount })}
            </p>
            <p className="font-medium text-foreground text-sm">
              &ldquo;{portfolio.name}&rdquo;
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              slot="close"
              variant="tertiary"
              size="lg"
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
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}
