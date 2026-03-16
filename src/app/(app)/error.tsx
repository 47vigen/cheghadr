'use client'

import { IconAlertTriangle } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <IconAlertTriangle size={48} className="text-destructive" />
      <h2 className="font-semibold text-lg">خطایی رخ داد</h2>
      <p className="text-muted-foreground text-sm">
        {error.message || 'لطفاً دوباره تلاش کنید'}
      </p>
      <Button onClick={reset}>تلاش مجدد</Button>
    </div>
  )
}
