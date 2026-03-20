import { describe, expect, it } from 'vitest'

import {
  dailyDigestMessage,
  portfolioAlertMessage,
  priceAlertMessage,
} from '@/lib/alert-messages'

describe('priceAlertMessage', () => {
  it('builds Persian HTML', () => {
    const text = priceAlertMessage('دلار', 'ABOVE', '1500000', 'fa')
    expect(text).toContain('هشدار قیمت')
    expect(text).toContain('دلار')
  })

  it('builds English HTML', () => {
    const text = priceAlertMessage('US Dollar', 'BELOW', '1500000', 'en')
    expect(text).toContain('Price alert')
    expect(text).toContain('US Dollar')
    expect(text).toContain('fell below')
  })
})

describe('portfolioAlertMessage', () => {
  it('localizes portfolio threshold copy', () => {
    expect(portfolioAlertMessage('ABOVE', '1', 'fa')).toContain('سبد دارایی')
    expect(portfolioAlertMessage('ABOVE', '1', 'en')).toContain(
      'Portfolio alert',
    )
  })
})

describe('dailyDigestMessage', () => {
  it('localizes digest body', () => {
    expect(dailyDigestMessage('1.5', 'Gold', 'fa')).toContain('خلاصه روزانه')
    expect(dailyDigestMessage('1.5', 'Gold', 'en')).toContain('Daily summary')
    expect(dailyDigestMessage('1.5', 'Gold', 'en')).toContain('Gold')
  })
})
