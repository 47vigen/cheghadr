'use client'

import { Caption } from '@telegram-apps/telegram-ui'
import { useLocale } from 'next-intl'

import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
}

export function ChangeLabel({ change }: ChangeLabelProps) {
  const locale = useLocale()
  const formatted = formatChange(change, locale)
  if (!formatted) return null

  // Semantic state colors (green/red) — minimal override using TGUI variables
  const colorClass = formatted.positive
    ? 'text-tgui-green'
    : 'text-tgui-destructive-text'

  return (
    <Caption level="2" className={colorClass}>
      {formatted.text}
    </Caption>
  )
}
