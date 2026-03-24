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
    expect(result.succeededAlertIds).toEqual(['a1', 'a2'])
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
    expect(result.succeededAlertIds).toEqual([])
  })

  it('returns zero counts for empty queue', async () => {
    const queue = new NotificationQueue()

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(0)
    expect(result.succeededAlertIds).toEqual([])
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

  it('returns correct succeededAlertIds for mixed success/failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let callCount = 0
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        callCount++
        // a1 succeeds (call 1), a2 fails both attempts (calls 2 & 3 — retry after 2s),
        // a3 succeeds (call 4)
        const ok = callCount !== 2 && callCount !== 3
        return Promise.resolve({
          ok: true,
          json: async () =>
            ok
              ? { ok: true, result: { message_id: callCount } }
              : { ok: false, description: 'Blocked' },
        })
      }),
    )

    const queue = new NotificationQueue()
    queue.enqueue({ telegramUserId: BigInt(1), text: 'msg1', alertId: 'a1' })
    queue.enqueue({ telegramUserId: BigInt(2), text: 'msg2', alertId: 'a2' })
    queue.enqueue({ telegramUserId: BigInt(3), text: 'msg3', alertId: 'a3' })

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.sent).toBe(2)
    expect(result.failed).toBe(1)
    expect(result.succeededAlertIds).toEqual(['a1', 'a3'])
  })

  it('succeededAlertIds does not contain failed alert ids', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, description: 'User blocked bot' }),
      }),
    )

    const queue = new NotificationQueue()
    queue.enqueue({
      telegramUserId: BigInt(111),
      text: 'msg',
      alertId: 'failed-alert',
    })

    const drainPromise = queue.drain()
    await vi.runAllTimersAsync()
    const result = await drainPromise

    expect(result.succeededAlertIds).not.toContain('failed-alert')
    expect(result.succeededAlertIds).toHaveLength(0)
  })
})
