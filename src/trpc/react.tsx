'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { httpBatchStreamLink } from '@trpc/client'
import { createTRPCReact } from '@trpc/react-query'
import SuperJSON from 'superjson'

import type { AppRouter } from '@/server/api/root'
import { getRawInitData } from '@/utils/telegram'

import {
  TRPC_QUERY_PERSIST_BUSTER,
  TRPC_QUERY_PERSIST_MAX_AGE,
  trpcQueryPersister,
} from './persister'
import { getQueryClient } from './query-client'
import { shouldDehydrateTrpcQuery } from './should-dehydrate-query'

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
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: trpcQueryPersister,
          maxAge: TRPC_QUERY_PERSIST_MAX_AGE,
          buster: TRPC_QUERY_PERSIST_BUSTER,
          dehydrateOptions: {
            shouldDehydrateQuery: shouldDehydrateTrpcQuery,
          },
        }}
      >
        {children}
        {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-left" /> */}
      </PersistQueryClientProvider>
    </api.Provider>
  )
}
