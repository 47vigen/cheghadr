'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import WebApp from '@twa-dev/sdk'
import { NextIntlClientProvider } from 'next-intl'

import type { Locale } from '@/i18n/routing'
import { api } from '@/trpc/react'

import enMessages from '../../messages/en.json'
import faMessages from '../../messages/fa.json'

const STATIC_MESSAGES: Record<Locale, Record<string, unknown>> = {
  en: enMessages as Record<string, unknown>,
  fa: faMessages as Record<string, unknown>,
}

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
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof window !== 'undefined' ? detectLocale() : 'en',
  )
  const [messages, setMessages] = useState<Record<string, unknown>>(
    () => STATIC_MESSAGES[detectLocale()],
  )
  const localeChangeFromUserRef = useRef(false)

  const { mutate: persistPreferredLocale } =
    api.user.setPreferredLocale.useMutation({ retry: false })

  const setLocale = useCallback((next: Locale) => {
    localeChangeFromUserRef.current = true
    setLocaleState(next)
  }, [])

  useEffect(() => {
    setMessages(STATIC_MESSAGES[locale])
  }, [locale])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = locale === 'fa' ? 'rtl' : 'ltr'
  }, [locale])

  useEffect(() => {
    if (!localeChangeFromUserRef.current) return
    persistPreferredLocale({ locale })
  }, [locale, persistPreferredLocale])

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  )
}
