import { NextRequest } from 'next/server'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { verifyCronAuth } from '@/server/cron/auth'
import { runPortfolioCron } from '@/server/cron/portfolio-snapshot'

vi.mock('@/server/cron/auth', () => ({
  verifyCronAuth: vi.fn(),
}))

vi.mock('@/server/cron/portfolio-snapshot', () => ({
  runPortfolioCron: vi.fn(),
}))

vi.mock('@/server/db', () => ({
  db: {},
}))

import { GET } from '../route'

describe('GET /api/cron/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifyCronAuth).mockReturnValue({ authorized: true })
  })

  it('returns 200 with success false when portfolio cron throws', async () => {
    vi.mocked(runPortfolioCron).mockRejectedValue(new Error('db'))
    const req = new NextRequest('http://localhost/api/cron/portfolio')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      success: false,
      error: 'Portfolio cron failed',
    })
  })
})
