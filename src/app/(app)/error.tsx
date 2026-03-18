'use client'

import { useTranslations } from 'next-intl'

import { ErrorState } from '@/components/ui/async-states'

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
      <ErrorState
        header={t('sessionExpired')}
        description={t('sessionExpiredDescription')}
        retryLabel={t('reLogin')}
        onRetry={() => router.push('/login')}
      />
    )
  }

  if (isConnectionError(error)) {
    return (
      <ErrorState
        header={t('connectionError')}
        description={t('connectionErrorDescription')}
        retryLabel={t('retry')}
        onRetry={reset}
      />
    )
  }

  return (
    <ErrorState
      header={t('error')}
      description={error.message || t('tryAgain')}
      retryLabel={t('retry')}
      onRetry={reset}
    />
  )
}
