import type { ReactNode } from 'react'

import { BottomNav } from '@/components/bottom-nav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex-1 pb-[var(--tabbar-height,72px)]">{children}</main>
      <BottomNav />
    </div>
  )
}
