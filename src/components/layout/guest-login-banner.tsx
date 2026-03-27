'use client'

import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { getRawInitData } from '@/utils/telegram'

export function GuestLoginBanner() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const t = useTranslations('guest')

  // Don't show in Telegram mini app — auth handled via initData
  if (getRawInitData()) return null

  // Don't show on the login page itself
  if (pathname === '/login') return null

  // Don't show if authenticated or still loading
  if (status === 'loading' || session) return null

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center bg-primary px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5">
      <Link
        href={{ pathname: '/login', query: { callbackUrl: pathname } }}
        className="font-medium text-primary-foreground text-sm"
      >
        {t('ctaBanner')}
      </Link>
    </div>
  )
}
