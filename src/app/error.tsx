'use client'

/**
 * Root-level error boundary. Catches errors in ClientRootWrapper, ClientRoot,
 * or other root layout children. Uses plain english copy because i18n may not
 * be available if provider mounting fails.
 */
import { ErrorState } from '@/components/ui/async-states'

export default function RootError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <ErrorState
      header="Something went wrong"
      description={
        error.message || 'An unexpected error occurred. Please try again.'
      }
      retryLabel="Try again"
      onRetry={reset}
    />
  )
}
