'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

export function useTelegramBackButton(show: boolean) {
  const router = useRouter()
  // Keep a stable ref so the effect only re-runs on `show` changes
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg?.BackButton) return

    if (show) {
      tg.BackButton.show()
      const handler = () => routerRef.current.back()
      tg.BackButton.onClick(handler)
      return () => {
        tg.BackButton?.offClick(handler)
        tg.BackButton?.hide()
      }
    }

    tg.BackButton.hide()
    return () => {
      tg.BackButton?.hide()
    }
  }, [show])
}
