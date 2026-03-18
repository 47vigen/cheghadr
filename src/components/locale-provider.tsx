'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import WebApp from '@twa-dev/sdk'
import { NextIntlClientProvider } from 'next-intl'

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

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocaleContext(): LocaleContextValue | null {
  return useContext(LocaleContext)
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() =>
    typeof window !== 'undefined' ? detectLocale() : 'en',
  )
  const [messages, setMessages] = useState<Record<string, unknown>>({})

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

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
