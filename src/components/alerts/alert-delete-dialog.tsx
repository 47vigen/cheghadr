'use client'

import { AlertDialog, Button, Spinner, toast } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

interface AlertDeleteDialogProps {
  alertId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export function AlertDeleteDialog({
  alertId,
  isOpen,
  onOpenChange,
}: AlertDeleteDialogProps) {
  const t = useTranslations('alerts')
  const locale = useLocale()
  const { notificationOccurred, impactOccurred } = useTelegramHaptics()
  const utils = api.useUtils()

  const deleteMutation = api.alerts.delete.useMutation({
    onSuccess: () => {
      impactOccurred('medium')
      void utils.alerts.list.invalidate()
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
              {t('deleteConfirm')}
            </p>
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button slot="close" variant="tertiary" size="lg">
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onPress={() => deleteMutation.mutate({ id: alertId })}
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
