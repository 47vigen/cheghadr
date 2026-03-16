'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import {
  Caption,
  LargeTitle,
  Placeholder,
  Spinner,
  Text,
} from '@telegram-apps/telegram-ui'
import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { env } from '@/env'
import { getRawInitData } from '@/utils/telegram'

export default function LoginPage() {
  const router = useRouter()
  const t = useTranslations('login')
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'loading' | 'miniapp' | 'standalone'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

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
          router.replace('/')
        } else {
          setError(t('errorTelegram'))
          setMode('standalone')
        }
      })
      .catch(() => {
        setError(t('errorTelegram'))
        setMode('standalone')
      })
  }, [router, t])

  useEffect(() => {
    if (mode !== 'standalone') return

    window.onTelegramAuth = async (user) => {
      setError(null)
      const result = await signIn('telegram', {
        ...user,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
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
  }, [mode, router, t])

  if (mode === 'loading' || mode === 'miniapp') {
    return <Placeholder header={t('loading')} action={<Spinner size="l" />} />
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <LargeTitle weight="1">{t('title')}</LargeTitle>
        <Text weight="3" className="text-tgui-hint">
          {t('subtitle')}
        </Text>
      </div>

      {error && (
        <Caption level="1" className="text-tgui-destructive-text">
          {error}
        </Caption>
      )}

      <div ref={widgetContainerRef} />
    </div>
  )
}
