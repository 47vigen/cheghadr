import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { removeOldestQuery } from '@tanstack/react-query-persist-client'
import SuperJSON from 'superjson'

import { localStorageAsync } from './storage'

export const TRPC_QUERY_PERSIST_KEY = 'cheghadr-trpc-cache'
/** Bump when persisted cache shape or privacy rules change (drops old localStorage payload). */
export const TRPC_QUERY_PERSIST_BUSTER = 'cheghadr-v2'
export const TRPC_QUERY_PERSIST_MAX_AGE = 1_000 * 60 * 60 * 24 * 7

export const trpcQueryPersister = createAsyncStoragePersister({
  storage: localStorageAsync,
  key: TRPC_QUERY_PERSIST_KEY,
  serialize: (persistedClient) => SuperJSON.stringify(persistedClient),
  deserialize: (cachedString) => SuperJSON.parse(cachedString),
  retry: removeOldestQuery,
})
