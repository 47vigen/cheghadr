import { describe, expect, it } from 'vitest'

import {
  type DehydrateQueryLike,
  shouldDehydrateTrpcQuery,
} from '../should-dehydrate-query'

function q(partial: DehydrateQueryLike): DehydrateQueryLike {
  return partial
}

describe('shouldDehydrateTrpcQuery', () => {
  it('returns false when status is not success', () => {
    expect(
      shouldDehydrateTrpcQuery(
        q({
          queryKey: [['prices', 'latest']],
          state: { status: 'pending' },
        }),
      ),
    ).toBe(false)
    expect(
      shouldDehydrateTrpcQuery(
        q({
          queryKey: [['prices', 'latest']],
          state: { status: 'error' },
        }),
      ),
    ).toBe(false)
  })

  it('allows successful prices.* tRPC queries', () => {
    expect(
      shouldDehydrateTrpcQuery(
        q({
          queryKey: [['prices', 'latest']],
          state: { status: 'success' },
        }),
      ),
    ).toBe(true)
  })

  it('blocks user-scoped tRPC routers when successful', () => {
    for (const router of ['alerts', 'assets', 'portfolio', 'user'] as const) {
      expect(
        shouldDehydrateTrpcQuery(
          q({
            queryKey: [[router, 'list']],
            state: { status: 'success' },
          }),
        ),
      ).toBe(false)
    }
  })

  it('allows successful non-tRPC-shaped keys (e.g. plain top-level keys)', () => {
    expect(
      shouldDehydrateTrpcQuery(
        q({
          queryKey: ['custom', 'thing'],
          state: { status: 'success' },
        }),
      ),
    ).toBe(true)
  })

  it('treats empty tRPC path segment as non-tRPC and allows when successful', () => {
    expect(
      shouldDehydrateTrpcQuery(
        q({
          queryKey: [[]],
          state: { status: 'success' },
        }),
      ),
    ).toBe(true)
  })

  // Registry tests: ensure all known routers are accounted for.
  // If a new router is added without updating NON_PERSISTED_TRPC_ROUTERS, these tests should fail.
  const USER_SCOPED_ROUTERS = ['alerts', 'assets', 'portfolio', 'user'] as const
  const PUBLIC_ROUTERS = ['prices'] as const

  it.each(USER_SCOPED_ROUTERS)(
    'blocks SSR for user-scoped router: %s',
    (router) => {
      expect(
        shouldDehydrateTrpcQuery(
          q({ queryKey: [[router, 'list']], state: { status: 'success' } }),
        ),
      ).toBe(false)
    },
  )

  it.each(PUBLIC_ROUTERS)(
    'allows SSR for public router: %s',
    (router) => {
      expect(
        shouldDehydrateTrpcQuery(
          q({ queryKey: [[router, 'latest']], state: { status: 'success' } }),
        ),
      ).toBe(true)
    },
  )

  it('blocks user-scoped routers regardless of procedure name', () => {
    for (const router of USER_SCOPED_ROUTERS) {
      for (const proc of ['list', 'get', 'create', 'delete', 'update']) {
        expect(
          shouldDehydrateTrpcQuery(
            q({ queryKey: [[router, proc]], state: { status: 'success' } }),
          ),
        ).toBe(false)
      }
    }
  })
})
