import { isServer, QueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

const MAX_RETRY_COUNT = 3

let queryClient: QueryClient | null = null

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: Infinity,
        staleTime: 1_000 * 5, // 5s
        refetchInterval: 1_000 * 15, // 15s
        experimental_prefetchInRender: true,
        retry: (failureCount, error) => {
          if (isServer) {
            return false
          }

          if (isAxiosError(error)) {
            const status = Number(error.response?.status)

            if (status > 200 && status < 500) {
              return false
            }
          }

          return failureCount < MAX_RETRY_COUNT
        },
        retryDelay: (attemptIndex) => {
          return Math.min(1000 * 2 ** attemptIndex, 30000)
        },
      },
    },
  })
}

export function getQueryClient() {
  if (isServer) {
    return createQueryClient()
  }

  queryClient ||= createQueryClient()

  return queryClient
}
