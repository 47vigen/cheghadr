'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import WebApp from '@twa-dev/sdk'

export function useTelegramBackButton(show: boolean) {
  const router = useRouter()
  // Keep a stable ref so the effect only re-runs on `show` changes
  const routerRef = useRef(router)
  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    if (!WebApp.BackButton) return

    if (show) {
      WebApp.BackButton.show()
      const handler = () => routerRef.current.back()
      WebApp.BackButton.onClick(handler)
      return () => {
        WebApp.BackButton?.offClick(handler)
        WebApp.BackButton?.hide()
      }
    }

    WebApp.BackButton.hide()
    return () => {
      WebApp.BackButton?.hide()
    }
  }, [show])
}
