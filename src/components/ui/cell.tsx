'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

interface CellProps {
  before?: ReactNode
  children: ReactNode
  subtitle?: string
  subhead?: string
  after?: ReactNode
  onClick?: () => void
  className?: string
}

export function Cell({
  before,
  children,
  subtitle,
  subhead,
  after,
  onClick,
  className,
}: CellProps) {
  const Component = onClick ? 'button' : 'div'
  const isInteractive = !!onClick

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'cell-row',
        isInteractive && 'cell-row-interactive',
        className,
      )}
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
