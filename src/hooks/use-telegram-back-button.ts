'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useTelegramBackButton(show: boolean) {
  const router = useRouter()

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    if (show) {
      tg.BackButton.show()
      const handler = () => router.back()
      tg.BackButton.onClick(handler)
      return () => {
        tg.BackButton?.offClick(handler)
        tg.BackButton?.hide()
      }
    }

    tg.BackButton.hide()
  }, [show, router])
}
