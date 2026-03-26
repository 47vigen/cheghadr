import type { PrismaClient } from '@prisma/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createPortfolioSnapshot } from '@/lib/portfolio'
import { invalidatePriceCache } from '@/server/price-cache'

function createDbMock() {
  const db = {
    userAsset: {
      findMany: vi.fn(),
    },
    priceSnapshot: {
      findFirst: vi.fn(),
    },
    portfolioSnapshot: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }

  return db as unknown as PrismaClient & {
    userAsset: { findMany: ReturnType<typeof vi.fn> }
    priceSnapshot: { findFirst: ReturnType<typeof vi.fn> }
    portfolioSnapshot: {
      findFirst: ReturnType<typeof vi.fn>
      create: ReturnType<typeof vi.fn>
    }
  }
}

beforeEach(() => {
  // Clear the module-level price cache so each test starts fresh.
  invalidatePriceCache()
})

describe('createPortfolioSnapshot', () => {
  it('returns null when there are no user assets', async () => {
    const db = createDbMock()
    db.userAsset.findMany.mockResolvedValue([])
    db.priceSnapshot.findFirst.mockResolvedValue({
      snapshotAt: new Date(),
      data: { data: [] },
    })

    const result = await createPortfolioSnapshot(db, 'user-1', null)

    expect(result).toBeNull()
    expect(db.portfolioSnapshot.create).not.toHaveBeenCalled()
  })

  it('returns null when a recent snapshot already exists', async () => {
    const db = createDbMock()
    db.userAsset.findMany.mockResolvedValue([{ symbol: 'USD', quantity: '2' }])
    db.priceSnapshot.findFirst.mockResolvedValue({
      snapshotAt: new Date(),
      data: {
        data: [
          {
            base_currency: { symbol: 'USD' },
            sell_price: '500000',
          },
        ],
      },
    })
    db.portfolioSnapshot.findFirst.mockResolvedValue({ id: 'recent' })

    const result = await createPortfolioSnapshot(db, 'user-1', null)

    expect(result).toBeNull()
    expect(db.portfolioSnapshot.create).not.toHaveBeenCalled()
  })

  it('creates snapshot with computed total and breakdown', async () => {
    const db = createDbMock()
    db.userAsset.findMany.mockResolvedValue([{ symbol: 'USD', quantity: '2' }])
    db.priceSnapshot.findFirst.mockResolvedValue({
      snapshotAt: new Date(),
      data: {
        data: [
          {
            base_currency: { symbol: 'USD' },
            sell_price: '500000',
          },
        ],
      },
    })
    db.portfolioSnapshot.findFirst.mockResolvedValue(null)
    db.portfolioSnapshot.create.mockImplementation(async ({ data }) => ({
      id: 'snapshot-1',
      ...data,
      snapshotAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }))

    const result = await createPortfolioSnapshot(db, 'user-1', null)

    expect(db.portfolioSnapshot.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        portfolioId: null,
        totalIRT: 1000000,
        breakdown: [{ symbol: 'USD', quantity: 2, valueIRT: 1000000 }],
      },
    })
    expect(result?.totalIRT).toBe(1000000)
  })
})
