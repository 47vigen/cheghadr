'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

interface CellProps {
  before?: ReactNode
  children: ReactNode
  subtitle?: string
  subhead?: string
  after?: ReactNode
  /** Preferred interaction handler (React Aria style). */
  onPress?: () => void
  /** @deprecated Use onPress instead. */
  onClick?: () => void
  className?: string
}

export function Cell({
  before,
  children,
  subtitle,
  subhead,
  after,
  onPress,
  onClick,
  className,
}: CellProps) {
  const handler = onPress ?? onClick
  const Component = handler ? 'button' : 'div'

  return (
    <Component
      type={handler ? 'button' : undefined}
      onClick={handler}
      className={clsx('cell-row', handler && 'cell-row-interactive', className)}
    >
      {before && (
        <div className="flex shrink-0 items-center self-center">{before}</div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        {subhead && (
          <div className="text-muted-foreground text-xs leading-tight">
            {subhead}
          </div>
        )}
        <div className="truncate font-medium leading-snug">{children}</div>
        {subtitle && (
          <div className="truncate text-muted-foreground text-sm leading-snug">
            {subtitle}
          </div>
        )}
      </div>
      {after && <div className="shrink-0">{after}</div>}
    </Component>
  )
}
