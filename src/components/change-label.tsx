import { Caption } from '@telegram-apps/telegram-ui'

import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
}

export function ChangeLabel({ change }: ChangeLabelProps) {
  const formatted = formatChange(change)
  if (!formatted) return null

  return (
    <Caption
      level="2"
      className={
        formatted.positive ? 'text-tgui-green' : 'text-tgui-destructive-text'
      }
    >
      {formatted.text}
    </Caption>
  )
}
