'use client'

import type { ReactNode } from 'react'

import { BottomNav } from '@/components/layout/bottom-nav'
import { DevLocaleSwitcher } from '@/components/layout/dev-locale-switcher'
import { GuestLoginBanner } from '@/components/layout/guest-login-banner'

import { usePathname } from '@/i18n/navigation'

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const hasBottomNav = !pathname.startsWith('/assets/add')

  return (
    <div className="flex min-h-svh flex-col">
      <DevLocaleSwitcher />
      <GuestLoginBanner />
      <main
        className={`overscroll-behavior-y-contain flex-1 bg-background [touch-action:pan-y] ${
          hasBottomNav
            ? 'pb-[calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom))] [scroll-padding-bottom:calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom)+8px)]'
            : ''
        }`}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
