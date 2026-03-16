'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { retrieveRawInitData } from '@telegram-apps/sdk'
import { Spinner } from '@telegram-apps/telegram-ui'
import { signIn } from 'next-auth/react'

import { env } from '@/env'

function getRawInitData(): string | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    const raw = retrieveRawInitData()
    if (raw) return raw
  } catch {
    // SDK throws when no Telegram context is found — fall through
  }

  return window.Telegram?.WebApp?.initData || undefined
}

export default function LoginPage() {
  const router = useRouter()
  const widgetContainerRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'loading' | 'miniapp' | 'standalone'>(
    'loading',
  )
  const [error, setError] = useState<string | null>(null)
  const attemptedRef = useRef(false)

  // Detect context and auto-login for Mini App
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
          setError('خطا در ورود از طریق تلگرام')
          setMode('standalone')
        }
      })
      .catch(() => {
        setError('خطا در ورود از طریق تلگرام')
        setMode('standalone')
      })
  }, [router])

  // Inject the Telegram Login Widget script for standalone browsers
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
        setError('خطا در ورود')
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
  }, [mode, router])

  if (mode === 'loading' || mode === 'miniapp') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <Spinner size="l" />
        <p className="text-muted-foreground text-sm">در حال ورود…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-semibold text-2xl">چه‌قدر؟</h1>
        <p className="text-muted-foreground text-sm">
          برای ادامه با تلگرام وارد شوید
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div ref={widgetContainerRef} />
    </div>
  )
}
