'use client'

import { Button } from '@heroui/react'
import { IconWallet } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { EmptyStateBase } from '@/components/ui/async-states'

import { useRouter } from '@/i18n/navigation'

export function EmptyState() {
  const router = useRouter()
  const t = useTranslations('assets')

  return (
    <EmptyStateBase
      header={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button variant="primary" onPress={() => router.push('/assets/add')}>
          {t('addAsset')}
        </Button>
      }
      icon={<IconWallet size={48} stroke={1.5} />}
    />
  )
}
