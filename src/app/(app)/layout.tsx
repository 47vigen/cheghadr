import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

import { ClientRootWrapper } from '@/providers/client-root-wrapper'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClientRootWrapper>
      <AppShell>{children}</AppShell>
    </ClientRootWrapper>
  )
}
