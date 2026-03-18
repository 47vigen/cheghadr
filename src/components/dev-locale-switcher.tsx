'use client'

import { Button } from '@heroui/react'

import { useLocaleContext } from '@/components/locale-provider'

import { isTelegramWebApp } from '@/utils/telegram'

/**
 * Dev-only locale switcher for testing Persian/RTL in standalone browser.
 * Only visible when not in Telegram and NODE_ENV is development.
 */
export function DevLocaleSwitcher() {
  const ctx = useLocaleContext()
  if (!ctx || isTelegramWebApp() || process.env.NODE_ENV !== 'development') {
    return null
  }

  const { locale, setLocale } = ctx
  const nextLocale = locale === 'fa' ? 'en' : 'fa'

  return (
    <div className="fixed end-2 top-2 z-50">
      <Button
        variant="ghost"
        size="sm"
        onPress={() => setLocale(nextLocale)}
        className="text-muted-foreground"
      >
        {locale === 'fa' ? 'EN' : 'فا'}
      </Button>
    </div>
  )
}
