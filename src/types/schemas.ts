import { z } from 'zod'

export const breakdownItemSchema = z.object({
  symbol: z.string(),
  quantity: z.number(),
  valueIRT: z.number(),
})

export const breakdownSchema = z.array(breakdownItemSchema)

export type BreakdownItem = z.infer<typeof breakdownItemSchema>

/** Parse portfolio snapshot breakdown JSON; returns [] if invalid. */
export function parseBreakdownJson(value: unknown): BreakdownItem[] {
  const parsed = breakdownSchema.safeParse(value)
  return parsed.success ? parsed.data : []
}
