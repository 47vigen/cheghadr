import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationQueue } from '@/lib/notifications'

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = 'test-token-123'
  vi.useFakeTimers()
})

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('NotificationQueue', () => {
  it('drains and returns sent/failed counts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )

    const queue = new NotificationQueue()
    queue.enqueue({ telegramUserId: BigInt(111), text: 'msg1', alertId: 'a1' })
    queue.enqueue({ telegramUserId: BigInt(222), text: 'msg2', alertId: 'a2' })

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.sent).toBe(2)
    expect(result.failed).toBe(0)
  })

  it('counts failures when send fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, description: 'User blocked bot' }),
      }),
    )

    const queue = new NotificationQueue()
    queue.enqueue({ telegramUserId: BigInt(111), text: 'msg1', alertId: 'a1' })

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
  })

  it('returns zero counts for empty queue', async () => {
    const queue = new NotificationQueue()

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
  })

  it('clears queue after drain', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1 } }),
      }),
    )

    const queue = new NotificationQueue()
    queue.enqueue({ telegramUserId: BigInt(111), text: 'msg', alertId: 'a1' })

    const firstDrain = queue.drain()
    await vi.runAllTimersAsync()
    const first = await firstDrain

    const secondDrain = queue.drain()
    await vi.runAllTimersAsync()
    const second = await secondDrain

    expect(first.sent).toBe(1)
    expect(second.sent).toBe(0)
  })
})
