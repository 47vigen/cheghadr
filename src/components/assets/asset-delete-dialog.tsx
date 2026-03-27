'use client'

import { toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { DeleteDialog } from '@/components/ui/delete-dialog'

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
    <DeleteDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('deleteTitle')}
      body={
        <p className="text-center text-muted-foreground text-sm">
          {t('deleteConfirm', { name: assetName })}
        </p>
      }
      cancelLabel={t('cancel')}
      confirmLabel={t('delete')}
      onConfirm={() => deleteMutation.mutate({ id: assetId })}
      isPending={deleteMutation.isPending}
    />
  )
}
