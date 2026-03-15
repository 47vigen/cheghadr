'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'
import { useTheme } from 'next-themes'

export function TelegramProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const tg = window.Telegram?.WebApp

    if (tg) {
      tg.expand()
      tg.ready()
      setAppearance(tg.colorScheme)
    } else {
      setAppearance(resolvedTheme === 'dark' ? 'dark' : 'light')
    }
  }, [resolvedTheme])

  return (
    <AppRoot appearance={appearance} dir="rtl">
      {children}
    </AppRoot>
  )
}
