'use client'

import type { Route } from 'next'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'
import { getRawInitData } from '@/utils/telegram'

export function GuestLoginBanner() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('guest')

  // Don't show in Telegram mini app — auth handled via initData
  if (getRawInitData()) return null

  // Don't show on the login page itself
  if (pathname === '/login') return null

  // Don't show if authenticated or still loading
  if (status === 'loading' || session) return null

  const handleLogin = () => {
    const encodedPath = encodeURIComponent(pathname)
    router.push(`/login?callbackUrl=${encodedPath}` as Route)
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center bg-primary px-4 py-2.5">
      <button
        type="button"
        className="font-medium text-primary-foreground text-sm"
        onClick={handleLogin}
      >
        {t('ctaBanner')}
      </button>
    </div>
  )
}
