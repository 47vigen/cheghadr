import type { ReactNode } from 'react'

import { ClientRootWrapper } from '@/providers/client-root-wrapper'

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <ClientRootWrapper>{children}</ClientRootWrapper>
}
