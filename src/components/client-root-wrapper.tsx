'use client'

import type { ReactNode } from 'react'
import dynamic from 'next/dynamic'

const ClientRoot = dynamic(
  () => import('@/components/client-root').then((m) => ({ default: m.ClientRoot })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-svh items-center justify-center"
        role="status"
        aria-label="Loading"
      >
        <div
          className="size-10 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"
          aria-hidden
        />
      </div>
    ),
  },
)

export function ClientRootWrapper({ children }: { children: ReactNode }) {
  return <ClientRoot>{children}</ClientRoot>
}
