import { Caption } from '@telegram-apps/telegram-ui'

import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
}

export function ChangeLabel({ change }: ChangeLabelProps) {
  const formatted = formatChange(change)
  if (!formatted) return null

  const color = formatted.positive
    ? 'var(--tgui--green)'
    : 'var(--tgui--destructive_text_color)'

  return (
    <Caption level="2" style={{ color }}>
      {formatted.text}
    </Caption>
  )
}
