import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { isServer } from '@tanstack/react-query'

import { getKey } from '@/utils/key'

export const persister = createSyncStoragePersister({
  key: getKey('QUERY_CACHE'),
  storage: !isServer ? window.localStorage : undefined,
})
