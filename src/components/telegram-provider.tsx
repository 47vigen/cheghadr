'use client'

import type { ReactNode } from 'react'
import { useEffect } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'

export function TelegramProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp
      if (tg?.initData) {
        tg.expand()
        tg.ready()
      }
    } catch {
      // Not in Telegram context
    }
  }, [])

  return <AppRoot dir="rtl">{children}</AppRoot>
}
