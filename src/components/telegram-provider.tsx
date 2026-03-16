'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'

function getInitialAppearance(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'

  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initData) return tg.colorScheme as 'light' | 'dark'
  } catch {
    // Not in Telegram context
  }

  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }

  return 'light'
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const initial = getInitialAppearance()
    setAppearance(initial)

    try {
      const tg = window.Telegram?.WebApp
      if (tg?.initData) {
        tg.expand()
        tg.ready()
      }
    } catch {
      // Not in Telegram context
    }

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      try {
        const tg = window.Telegram?.WebApp
        if (!tg?.initData) {
          setAppearance(e.matches ? 'dark' : 'light')
        }
      } catch {
        setAppearance(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery?.addEventListener('change', handleChange)
    return () => mediaQuery?.removeEventListener('change', handleChange)
  }, [])

  return (
    <AppRoot appearance={appearance} dir="rtl">
      {children}
    </AppRoot>
  )
}
