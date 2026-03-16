'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'
import { useTheme } from 'next-themes'

function getTelegramColorScheme(): 'light' | 'dark' | null {
  try {
    const tg = window.Telegram?.WebApp
    if (tg?.initData) return tg.colorScheme
  } catch {
    // Not in Telegram context
  }
  return null
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme()
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const tgTheme = getTelegramColorScheme()

    if (tgTheme) {
      const tg = window.Telegram?.WebApp
      tg?.expand()
      tg?.ready()
      setAppearance(tgTheme)
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
