/** Minimal shape for dehydrate filter (avoids a direct `@tanstack/query-core` dependency). */
export type DehydrateQueryLike = {
  queryKey: readonly unknown[]
  state: { status: string }
}

/** tRPC v11 query keys: `[pathSegments, input?]` where `pathSegments` is `string[]` (see `getQueryKeyInternal`). */
const NON_PERSISTED_TRPC_ROUTERS = new Set([
  'alerts',
  'assets',
  'portfolio',
  'user',
])

function trpcRouterFromQueryKey(queryKey: readonly unknown[]): string | null {
  const head = queryKey[0]
  if (!Array.isArray(head) || head.length === 0) return null
  const router = head[0]
  return typeof router === 'string' ? router : null
}

/**
 * Dehydrate / persist only successful queries, and never user-scoped tRPC routers.
 * Public-ish `prices.*` may be persisted; portfolio/assets/alerts/user may not.
 */
export function shouldDehydrateTrpcQuery(query: DehydrateQueryLike): boolean {
  if (query.state.status !== 'success') return false

  const router = trpcRouterFromQueryKey(query.queryKey)
  if (router === null) return true

  return !NON_PERSISTED_TRPC_ROUTERS.has(router)
}
