'use client'

import { useLocale } from 'next-intl'

import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
}

export function ChangeLabel({ change }: ChangeLabelProps) {
  const locale = useLocale()
  const formatted = formatChange(change, locale)
  if (!formatted) return null

  const isPositive = formatted.positive

  return (
    <span
      className={`inline-flex items-center px-1 py-0 font-display font-medium text-xs ${
        isPositive
          ? 'bg-success/15 text-success'
          : 'bg-destructive/15 text-destructive'
      }`}
    >
      {formatted.text}
    </span>
  )
}
