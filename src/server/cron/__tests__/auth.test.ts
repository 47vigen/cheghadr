import { NextRequest } from 'next/server'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { verifyCronAuth } from '@/server/cron/auth'

describe('verifyCronAuth', () => {
  const originalSecret = process.env.CRON_SECRET

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET
    } else {
      process.env.CRON_SECRET = originalSecret
    }
    vi.restoreAllMocks()
  })

  it('returns 401 when CRON_SECRET is missing', () => {
    delete process.env.CRON_SECRET
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const req = new NextRequest('http://localhost/api/cron/prices')
    const result = verifyCronAuth(req)

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(401)
    }
  })

  it('returns 401 when Authorization header does not match', () => {
    process.env.CRON_SECRET = 'expected-secret'

    const req = new NextRequest('http://localhost/api/cron/prices', {
      headers: { authorization: 'Bearer wrong' },
    })
    const result = verifyCronAuth(req)

    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(401)
    }
  })

  it('authorizes when Bearer token matches CRON_SECRET', () => {
    process.env.CRON_SECRET = 'expected-secret'

    const req = new NextRequest('http://localhost/api/cron/prices', {
      headers: { authorization: 'Bearer expected-secret' },
    })
    const result = verifyCronAuth(req)

    expect(result).toEqual({ authorized: true })
  })
})
