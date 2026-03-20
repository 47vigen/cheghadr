/** Maps app locale (`en` | `fa`) to BCP 47 tag for `Intl` formatters. */
export function getIntlLocale(locale: string): string {
  return locale === 'fa' ? 'fa-IR' : 'en-US'
}

export function formatIRT(value: number, locale = 'fa'): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(Math.round(value))
}

export function formatChange(
  change: string | null | undefined,
  locale = 'fa',
): {
  text: string
  positive: boolean
} | null {
  if (!change) return null
  const n = Number(change)
  if (Number.isNaN(n)) return null
  const formatted = new Intl.NumberFormat(getIntlLocale(locale), {
    signDisplay: 'always',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return { text: `${formatted}%`, positive: n >= 0 }
}

export function formatCompactCurrency(
  value: number,
  currency: 'USD' | 'EUR',
): string {
  const symbol = currency === 'USD' ? '$' : '€'
  const num =
    value < 1000
      ? Math.round(value).toLocaleString('en-US')
      : new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(value)
  return `≈ ${symbol}${num}`
}
