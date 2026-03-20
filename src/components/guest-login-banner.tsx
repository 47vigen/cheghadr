'use client'

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

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center bg-primary px-4 py-2.5">
      <button
        type="button"
        className="text-primary-foreground text-sm font-medium"
        onClick={() => router.push('/login?callbackUrl=/')}
      >
        {t('ctaBanner')}
      </button>
    </div>
  )
}
