import { describe, expect, it } from 'vitest'

import { escapeTelegramHtml } from '../html-escape'

describe('escapeTelegramHtml', () => {
  it('escapes ampersand angle brackets', () => {
    expect(escapeTelegramHtml('a & b <c>')).toBe('a &amp; b &lt;c&gt;')
  })

  it('does not double-escape typical safe text', () => {
    expect(escapeTelegramHtml('دلار آمریکا')).toBe('دلار آمریکا')
  })

  it('handles empty string', () => {
    expect(escapeTelegramHtml('')).toBe('')
  })
})
