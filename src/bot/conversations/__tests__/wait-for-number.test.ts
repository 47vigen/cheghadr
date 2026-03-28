import { describe, expect, it } from 'vitest'

import {
  isWizardExitCommandText,
  normalizeWizardNumericInput,
  parseWizardPositiveNumber,
} from '../wait-for-number'

describe('normalizeWizardNumericInput', () => {
  it('strips ASCII and Persian grouping commas', () => {
    expect(normalizeWizardNumericInput(' 1,234٬5 ')).toBe('12345')
  })
})

describe('parseWizardPositiveNumber', () => {
  it('accepts integers and decimals', () => {
    expect(parseWizardPositiveNumber('42')).toBe('42')
    expect(parseWizardPositiveNumber('0.5')).toBe('0.5')
    expect(parseWizardPositiveNumber('1,000.25')).toBe('1000.25')
  })

  it('rejects non-positive and invalid', () => {
    expect(parseWizardPositiveNumber('0')).toBeNull()
    expect(parseWizardPositiveNumber('-3')).toBeNull()
    expect(parseWizardPositiveNumber('abc')).toBeNull()
    expect(parseWizardPositiveNumber('')).toBeNull()
  })
})

describe('isWizardExitCommandText', () => {
  it('detects /start and /cancel with optional bot suffix and whitespace', () => {
    expect(isWizardExitCommandText('/start')).toBe(true)
    expect(isWizardExitCommandText('  /cancel  ')).toBe(true)
    expect(isWizardExitCommandText('/start@CheghadrBot')).toBe(true)
    expect(isWizardExitCommandText('/cancel@CheghadrBot extra')).toBe(true)
  })

  it('returns false for normal numbers and other commands', () => {
    expect(isWizardExitCommandText('85000000')).toBe(false)
    expect(isWizardExitCommandText('/help')).toBe(false)
  })
})
