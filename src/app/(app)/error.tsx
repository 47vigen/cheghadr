'use client'

import { IconAlertTriangle } from '@tabler/icons-react'
import { Button, Placeholder } from '@telegram-apps/telegram-ui'

export default function AppError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <Placeholder
      header="خطایی رخ داد"
      description={error.message || 'لطفاً دوباره تلاش کنید'}
      action={
        <Button mode="filled" onClick={reset}>
          تلاش مجدد
        </Button>
      }
    >
      <IconAlertTriangle
        size={64}
        style={{ color: 'var(--tgui--destructive_text_color)' }}
      />
    </Placeholder>
  )
}
