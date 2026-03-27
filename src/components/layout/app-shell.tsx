'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

import { BottomNav } from '@/components/layout/bottom-nav'
import { GuestLoginBanner } from '@/components/layout/guest-login-banner'

import { usePathname } from '@/i18n/navigation'
import { NO_NAV_ROUTES } from '@/lib/routes'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideNav = NO_NAV_ROUTES.some((r) => pathname.startsWith(r))

  return (
    <div className="flex min-h-svh flex-col">
      <GuestLoginBanner />
      <main
        className={clsx(
          'overscroll-behavior-y-contain flex-1 bg-background [scroll-padding-bottom:calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom)+8px)] [touch-action:pan-y]',
          hideNav
            ? 'pb-[env(safe-area-inset-bottom)]'
            : 'pb-[calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
