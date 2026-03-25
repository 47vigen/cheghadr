import { describe, expect, it } from 'vitest'

import { isValidIanaTimeZone } from '@/lib/timezone-schema'

describe('isValidIanaTimeZone', () => {
  it('accepts UTC and common IANA names', () => {
    expect(isValidIanaTimeZone('UTC')).toBe(true)
    expect(isValidIanaTimeZone('Asia/Tehran')).toBe(true)
    expect(isValidIanaTimeZone('America/New_York')).toBe(true)
  })

  it('rejects invalid strings', () => {
    expect(isValidIanaTimeZone('Not/AZone')).toBe(false)
  })
})
