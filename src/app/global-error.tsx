'use client'

import { ErrorState } from '@/components/ui/async-states'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <ErrorState
          header="Application error"
          description={
            error.message || 'A critical error occurred. Please try again.'
          }
          retryLabel="Reload"
          onRetry={reset}
        />
      </body>
    </html>
  )
}
