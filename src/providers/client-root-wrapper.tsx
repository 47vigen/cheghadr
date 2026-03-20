'use client'

import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'

import { DynamicLoader } from '@/components/dynamic-loader'

const ClientRoot = dynamic(
  () =>
    import('@/providers/client-root').then((m) => ({ default: m.ClientRoot })),
  { ssr: false, loading: () => <DynamicLoader /> },
)

export function ClientRootWrapper({ children }: { children: ReactNode }) {
  return <ClientRoot>{children}</ClientRoot>
}
