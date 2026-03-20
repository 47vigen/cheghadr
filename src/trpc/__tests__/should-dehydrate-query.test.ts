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
})
