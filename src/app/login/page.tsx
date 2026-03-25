'use client'

import type { Route } from 'next'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Spinner, Text } from '@heroui/react'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { env } from '@/env'
import { useRouter } from '@/i18n/navigation'
import { getRawInitData } from '@/utils/telegram'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl') ?? '/app'
  // Validate callbackUrl to prevent open redirect — only allow same-origin relative paths
  const isSafeCallback =
    rawCallback.startsWith('/') && !rawCallback.startsWith('//')
  const callbackUrl = (isSafeCallback ? rawCallback : '/app') as Route
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'loading' | 'miniapp' | 'standalone'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  const isFromAssets = callbackUrl === '/app'
  const subtitleKey = isFromAssets ? 'subtitlePortfolio' : 'subtitle'

  useEffect(() => {
    if (attemptedRef.current) return
    attemptedRef.current = true

    const rawInitData = getRawInitData()

    if (!rawInitData) {
      setMode('standalone')
      return
    }

    setMode('miniapp')

    signIn('telegram-miniapp', { initData: rawInitData, redirect: false })
      .then((result) => {
        if (result?.ok) {
          router.replace(callbackUrl)
        } else {
          setError(t('errorTelegram'))
          setMode('standalone')
        }
      })
      .catch(() => {
        setError(t('errorTelegram'))
        setMode('standalone')
      })
  }, [router, t, callbackUrl])

  useEffect(() => {
    if (mode !== 'standalone') return

    window.onTelegramAuth = async (user) => {
      setError(null)
      const result = await signIn('telegram', {
        ...user,
        redirect: false,
      })

      if (result?.ok) {
        router.push(callbackUrl)
      } else {
        setError(t('error'))
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute(
      'data-telegram-login',
      env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    )
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    widgetContainerRef.current?.appendChild(script)

    return () => {
      script.remove()
      delete window.onTelegramAuth
    }
  }, [mode, router, t, callbackUrl])

  if (mode === 'loading' || mode === 'miniapp') {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-2 py-6 text-center">
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="font-display text-muted-foreground text-sm tracking-widest"
          aria-hidden
        >
          Cheghadr?
        </span>
        <Text className="font-display font-semibold text-2xl">
          {t('title')}
        </Text>
        <Text className="text-muted-foreground text-sm">{t(subtitleKey)}</Text>
      </div>

      {error && <p className="text-destructive text-xs">{error}</p>}

      <div ref={widgetContainerRef} />
    </div>
  )
}
