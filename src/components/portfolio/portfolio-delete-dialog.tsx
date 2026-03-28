'use client'

import { toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { DeleteDialog } from '@/components/ui/delete-dialog'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

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
  const tCommon = useTranslations('common')
  const utils = api.useUtils()
  const { notificationOccurred, impactOccurred } = useTelegramHaptics()

  const deleteMutation = api.portfolio.delete.useMutation({
    onSuccess: () => {
      impactOccurred('medium')
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
      notificationOccurred('error')
      toast.danger(err.message || t('toastDeleteError'))
    },
  })

  if (!portfolio) return null

  return (
    <DeleteDialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('deleteTitle')}
      body={
        <div className="flex flex-col gap-4">
          <p className="text-foreground text-sm">
            {t('deleteConfirm', { count: portfolio.assetCount })}
          </p>
          <p className="font-medium text-foreground text-sm">
            &ldquo;{portfolio.name}&rdquo;
          </p>
        </div>
      }
      cancelLabel={tCommon('cancel')}
      confirmLabel={tCommon('delete')}
      onConfirm={() => deleteMutation.mutate({ id: portfolio.id })}
      isPending={deleteMutation.isPending}
    />
  )
}
