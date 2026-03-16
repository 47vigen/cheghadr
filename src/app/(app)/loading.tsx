'use client'

import { Spinner } from '@telegram-apps/telegram-ui'

export default function AppLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner size="l" />
    </div>
  )
}
