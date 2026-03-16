import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
  className?: string
}

export function ChangeLabel({ change, className }: ChangeLabelProps) {
  const formatted = formatChange(change)
  if (!formatted) return null

  return (
    <span
      className={
        className ?? (formatted.positive ? 'text-green-600' : 'text-red-500')
      }
    >
      {formatted.text}
    </span>
  )
}
