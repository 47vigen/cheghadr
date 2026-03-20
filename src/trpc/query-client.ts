import { QueryClient } from '@tanstack/react-query'
import SuperJSON from 'superjson'

import { shouldDehydrateTrpcQuery } from './should-dehydrate-query'

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        staleTime: 1_000 * 5,
        refetchInterval: 1_000 * 15,
        experimental_prefetchInRender: true,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: shouldDehydrateTrpcQuery,
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
