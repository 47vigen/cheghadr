'use client'

import { useRouter } from 'next/navigation'

import { IconWallet } from '@tabler/icons-react'
import { Button, Placeholder } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

export function EmptyState() {
  const router = useRouter()
  const t = useTranslations('assets')

  return (
    <Placeholder
      header={t('emptyTitle')}
      description={t('emptyDescription')}
      action={
        <Button mode="filled" onClick={() => router.push('/assets/add')}>
          {t('addAsset')}
        </Button>
      }
    >
      <IconWallet size={64} className="text-tgui-hint" />
    </Placeholder>
  )
}
