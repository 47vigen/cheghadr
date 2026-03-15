'use client'

import { type FunctionComponent, type PropsWithChildren, useState } from 'react'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { getQueryClient } from '@/modules/API/Query/utils/query'

export const QueryProvider: FunctionComponent<PropsWithChildren> = ({
  children,
}) => {
  const [queryClient] = useState(() => getQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools
        initialIsOpen={false}
        position="bottom"
        buttonPosition="top-left"
      />
    </QueryClientProvider>
  )
}
