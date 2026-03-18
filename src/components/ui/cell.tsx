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
      {before && <div className="shrink-0">{before}</div>}
      <div className="min-w-0 flex-1">
        {subhead && (
          <div className="mb-0 text-muted-foreground text-xs">{subhead}</div>
        )}
        <div className="truncate font-medium">{children}</div>
        {subtitle && (
          <div className="mt-0 truncate text-muted-foreground text-sm">
            {subtitle}
          </div>
        )}
      </div>
      {after && <div className="shrink-0">{after}</div>}
    </Component>
  )
}
