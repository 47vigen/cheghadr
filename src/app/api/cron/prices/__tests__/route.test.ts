import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyCronAuth } from '@/server/cron/auth'
import {
  getPriceCronConfigError,
  runPriceSnapshotCron,
} from '@/server/cron/price-snapshot'

vi.mock('@/server/cron/auth', () => ({
  verifyCronAuth: vi.fn(),
}))

vi.mock('@/server/cron/price-snapshot', () => ({
  getPriceCronConfigError: vi.fn(),
  runPriceSnapshotCron: vi.fn(),
}))

vi.mock('@/server/db', () => ({
  db: {},
}))

import { GET } from '../route'

describe('GET /api/cron/prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyCronAuth).mockReturnValue({ authorized: true })
  })

  it('returns 200 with success false when API URL is not configured', async () => {
    vi.mocked(getPriceCronConfigError).mockReturnValue(
      'NEXT_PUBLIC_ECOTRUST_API_URL is not configured',
    )
    const req = new NextRequest('http://localhost/api/cron/prices')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'API URL not configured',
    })
  })

  it('returns 200 with success false when price snapshot cron throws', async () => {
    vi.mocked(getPriceCronConfigError).mockReturnValue(null)
    vi.mocked(runPriceSnapshotCron).mockRejectedValue(new Error('network'))
    const req = new NextRequest('http://localhost/api/cron/prices')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Failed to fetch prices',
    })
  })
})
