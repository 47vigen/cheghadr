import { z } from 'zod'

export function isValidIanaTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
    return true
  } catch {
    return false
  }
}

/** IANA timezone string; empty/undefined becomes UTC. */
export const portfolioHistoryTimezoneSchema = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim()
    return t === undefined || t === '' ? 'UTC' : t
  })
  .refine(isValidIanaTimeZone, 'Invalid timezone')
