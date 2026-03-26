import type { ReactNode } from 'react'

import { ClientRootWrapper } from '@/providers/client-root-wrapper'

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return <ClientRootWrapper>{children}</ClientRootWrapper>
}
