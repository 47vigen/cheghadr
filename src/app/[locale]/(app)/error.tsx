'use client'

import { IconAlertTriangle } from '@tabler/icons-react'
import { Button, Placeholder } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'

const PRISMA_ERROR_PATTERNS = [
  'connection',
  'timeout',
  'ECONNREFUSED',
  'P1001',
  'P1002',
  'P2024',
]

function isUnauthorized(error: Error): boolean {
  return (
    error.message.includes('UNAUTHORIZED') ||
    error.message.includes('Unauthorized') ||
    (error as { data?: { code?: string } }).data?.code === 'UNAUTHORIZED'
  )
}

function isConnectionError(error: Error): boolean {
  return PRISMA_ERROR_PATTERNS.some((pat) => error.message.includes(pat))
}

export default function AppError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const t = useTranslations('common')
  const router = useRouter()

  if (isUnauthorized(error)) {
    return (
      <Placeholder
        header={t('sessionExpired')}
        description={t('sessionExpiredDescription')}
        action={
          <Button mode="filled" onClick={() => router.push('/login')}>
            {t('reLogin')}
          </Button>
        }
      >
        <IconAlertTriangle size={64} className="text-tgui-destructive-text" />
      </Placeholder>
    )
  }

  if (isConnectionError(error)) {
    return (
      <Placeholder
        header={t('connectionError')}
        description={t('connectionErrorDescription')}
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
