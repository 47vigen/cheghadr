'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

import { BottomNav } from '@/components/layout/bottom-nav'
import { DevLocaleSwitcher } from '@/components/layout/dev-locale-switcher'
import { GuestLoginBanner } from '@/components/layout/guest-login-banner'

import { usePathname } from '@/i18n/navigation'

const NO_NAV_ROUTES = ['/alerts', '/assets/add']

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hideNav = NO_NAV_ROUTES.includes(pathname)

  return (
    <div className="flex min-h-svh flex-col">
      <DevLocaleSwitcher />
      <GuestLoginBanner />
      <main
        className={clsx(
          'overscroll-behavior-y-contain flex-1 bg-background [scroll-padding-bottom:calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom)+8px)] [touch-action:pan-y]',
          !hideNav &&
            'pb-[calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom))]',
        )}
      >
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  )
}
