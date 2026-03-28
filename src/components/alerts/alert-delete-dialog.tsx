'use client'

import { toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { DeleteDialog } from '@/components/ui/delete-dialog'

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
  const tCommon = useTranslations('common')
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
    <DeleteDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('deleteTitle')}
      body={
        <p className="text-center text-muted-foreground text-sm">
          {t('deleteConfirm')}
        </p>
      }
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('delete')}
      onConfirm={() => deleteMutation.mutate({ id: alertId })}
      isPending={deleteMutation.isPending}
    />
  )
}
