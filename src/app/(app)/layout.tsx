'use client'

import type { ReactNode } from 'react'

import { BottomNav } from '@/components/bottom-nav'
import { DevLocaleSwitcher } from '@/components/dev-locale-switcher'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <DevLocaleSwitcher />
      <main className="overscroll-behavior-y-contain flex-1 overflow-y-auto bg-background pb-[calc(var(--tabbar-height,56px)+env(safe-area-inset-bottom))] [touch-action:pan-y]">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
