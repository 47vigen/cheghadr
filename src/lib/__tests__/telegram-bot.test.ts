import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { sendBotMessageWithRetry } from '@/lib/telegram-bot'

const MOCK_TOKEN = 'test-bot-token-123'

function makeFetchMock(responses: Array<{ ok: boolean; json: unknown }>) {
  let callCount = 0
  return vi.fn(() => {
    const response = responses[callCount] ?? responses[responses.length - 1]
    callCount++
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(response.json),
    })
  })
}

beforeEach(() => {
  process.env.TELEGRAM_BOT_TOKEN = MOCK_TOKEN
  vi.useFakeTimers()
})

afterEach(() => {
  delete process.env.TELEGRAM_BOT_TOKEN
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('sendBotMessageWithRetry', () => {
  it('returns success on successful send', async () => {
    vi.stubGlobal(
      'fetch',
      makeFetchMock([{ ok: true, json: { ok: true, result: { message_id: 42 } } }]),
    )

    const promise = sendBotMessageWithRetry(BigInt(123456789), 'Hello')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
    expect(result.messageId).toBe(42)
  })

  it('retries once on first failure and succeeds on second attempt', async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: { ok: false, description: 'Rate limit' } },
      { ok: true, json: { ok: true, result: { message_id: 99 } } },
    ])
    vi.stubGlobal('fetch', fetchMock)

    const promise = sendBotMessageWithRetry(BigInt(123456789), 'Hello')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(true)
    expect(result.messageId).toBe(99)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns failure after two failed attempts', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal(
      'fetch',
      makeFetchMock([
        { ok: true, json: { ok: false, description: 'Bad Request' } },
        { ok: true, json: { ok: false, description: 'Bad Request' } },
      ]),
    )

    const promise = sendBotMessageWithRetry(BigInt(123456789), 'Hello')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[BOT] Failed to deliver to'),
    )
  })

  it('returns failure when TELEGRAM_BOT_TOKEN is not configured', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.stubGlobal('fetch', vi.fn())

    const promise = sendBotMessageWithRetry(BigInt(123456789), 'Hello')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.success).toBe(false)
    expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled()
  })
})
