import { formatChange } from '@/lib/prices'

interface ChangeLabelProps {
  change: string | null | undefined
  className?: string
}

export function ChangeLabel({ change, className }: ChangeLabelProps) {
  const formatted = formatChange(change)
  if (!formatted) return null

  const defaultClass = formatted.positive ? 'text-green-600' : 'text-red-500'

  return <span className={className ?? defaultClass}>{formatted.text}</span>
}
