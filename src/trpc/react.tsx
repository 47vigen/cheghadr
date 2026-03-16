'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
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
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" />
      </QueryClientProvider>
    </api.Provider>
  )
}
