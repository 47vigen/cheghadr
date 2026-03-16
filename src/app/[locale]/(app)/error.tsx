'use client'

import { IconAlertTriangle } from '@tabler/icons-react'
import { Button, Placeholder } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

export default function AppError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const t = useTranslations('common')

  return (
    <Placeholder
      header={t('error')}
      description={error.message || t('tryAgain')}
      action={
        <Button mode="filled" onClick={reset}>
          {t('retry')}
        </Button>
      }
    >
      <IconAlertTriangle size={64} className="text-tgui-destructive-text" />
    </Placeholder>
  )
}
