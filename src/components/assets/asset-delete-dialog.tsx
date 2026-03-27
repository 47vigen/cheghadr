'use client'

import { AlertDialog, Button, Spinner, toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

export interface AssetDeleteDialogProps {
  assetId: string
  assetName: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AssetDeleteDialog({
  assetId,
  assetName,
  isOpen,
  onOpenChange,
}: AssetDeleteDialogProps) {
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
      toast.danger(err.message || t('toastDeleteError'))
    },
  })

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
          <AlertDialog.Body>
            <p className="text-center text-muted-foreground text-sm">
              {t('deleteConfirm', { name: assetName })}
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary" size="lg">
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onPress={() => deleteMutation.mutate({ id: assetId })}
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
