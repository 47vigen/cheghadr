'use client'

import { toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { api } from '@/trpc/react'

interface UseAddAssetMutationOptions {
  onSuccess?: () => void
}

export function useAddAssetMutation({
  onSuccess,
}: UseAddAssetMutationOptions = {}) {
  const t = useTranslations('assets')
  const utils = api.useUtils()
  const { notificationOccurred } = useTelegramHaptics()

  const mutation = api.assets.add.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      toast.success(t('toastAdded'))
      onSuccess?.()
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastAddError'))
    },
  })

  return mutation
}
