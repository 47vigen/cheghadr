'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { httpBatchStreamLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import SuperJSON from 'superjson'

import type { AppRouter } from '@/server/api/root'
import { getRawInitData } from '@/utils/telegram'

import { getQueryClient } from './query-client'

export const api = createTRPCReact<AppRouter>()

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        httpBatchStreamLink({
          url: '/api/trpc',
          transformer: SuperJSON,
          headers() {
            const initData = getRawInitData()
            return initData ? { 'x-telegram-init-data': initData } : {}
          },
        }),
      ],
    }),
  )

  return (
    <api.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <Devtools />
        )}
      </QueryClientProvider>
    </api.Provider>
  )
}

function Devtools() {
  const [DevtoolsComponent, setDevtoolsComponent] = useState<
    React.ComponentType<{ initialIsOpen?: boolean; buttonPosition?: string }> | null
  >(null)

  useEffect(() => {
    import('@tanstack/react-query-devtools').then((mod) => {
      setDevtoolsComponent(() => mod.ReactQueryDevtools as React.ComponentType<{ initialIsOpen?: boolean; buttonPosition?: string }>)
    })
  }, [])

  if (!DevtoolsComponent) return null
  return (
    <DevtoolsComponent initialIsOpen={false} buttonPosition="top-left" />
  )
}
