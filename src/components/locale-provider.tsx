'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { NextIntlClientProvider } from 'next-intl'
import WebApp from '@twa-dev/sdk'

import type { Locale } from '@/i18n/routing'

function mapToLocale(code: string | undefined): Locale {
  if (!code) return 'en'
  const lower = code.toLowerCase().slice(0, 2)
  if (lower === 'fa') return 'fa'
  return 'en'
}

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  const tg = WebApp?.initDataUnsafe?.user?.language_code
  if (tg) return mapToLocale(tg)
  return mapToLocale(navigator.language)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    typeof window !== 'undefined' ? detectLocale() : 'en',
  )
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)

  const loadMessages = useCallback(async (l: Locale) => {
    const m = await import(`../../messages/${l}.json`)
    return m.default as Record<string, unknown>
  }, [])

  useEffect(() => {
    loadMessages(locale).then(setMessages)
  }, [locale, loadMessages])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
  }, [locale])

  if (!messages) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div
          className="size-10 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"
          aria-hidden
        />
      </div>
    )
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
