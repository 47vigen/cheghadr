'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { signIn } from 'next-auth/react'

type TelegramWidgetUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

export default function LoginPage() {
  const router = useRouter()
  const widgetContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Attach the callback that Telegram Login Widget will call
    ;(
      window as Window & {
        onTelegramAuth?: (user: TelegramWidgetUser) => void
      }
    ).onTelegramAuth = async (user) => {
      const result = await signIn('telegram', {
        ...user,
        redirect: false,
      })

      if (result?.ok) {
        router.push('/')
      }
    }

    // Inject the Telegram Login Widget script
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.async = true
    script.setAttribute('data-telegram-login', 'YOUR_BOT_USERNAME')
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')

    if (widgetContainerRef.current) {
      widgetContainerRef.current.appendChild(script)
    }

    return () => {
      script.remove()
    }
  }, [router])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-semibold text-2xl">چه‌قدر؟</h1>
        <p className="text-muted-foreground text-sm">
          برای ادامه با تلگرام وارد شوید
        </p>
      </div>

      <div ref={widgetContainerRef} />
    </div>
  )
}
