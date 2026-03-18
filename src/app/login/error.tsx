'use client'

import { useTranslations } from 'next-intl'

import { ErrorState } from '@/components/ui/async-states'

export default function LoginError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  const t = useTranslations('common')

  return (
    <ErrorState
      header={t('error')}
      description={error.message || t('tryAgain')}
      retryLabel={t('retry')}
      onRetry={reset}
    />
  )
}
