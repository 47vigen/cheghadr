'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

type PlaceholderIconSize = 'sm' | 'md' | 'lg'
type PlaceholderVariant = 'default' | 'error' | 'empty'

interface PlaceholderProps {
  header?: string
  description?: string
  action?: ReactNode
  children?: ReactNode
  className?: string
  /** Icon size: sm=32px, md=48px, lg=64px. Default: md */
  iconSize?: PlaceholderIconSize
  /** Variant controls icon color: default/empty=muted, error=destructive */
  variant?: PlaceholderVariant
}

const iconSizeClasses: Record<PlaceholderIconSize, string> = {
  sm: '[&>svg]:size-8',
  md: '[&>svg]:size-12',
  lg: '[&>svg]:size-16',
}

const variantClasses: Record<PlaceholderVariant, string> = {
  default: 'text-muted-foreground/60 [&>svg]:opacity-70',
  empty: 'text-muted-foreground/60 [&>svg]:opacity-70',
  error: 'text-destructive [&>svg]:opacity-90',
}

export function Placeholder({
  header,
  description,
  action,
  children,
  className,
  iconSize = 'md',
  variant = 'default',
}: PlaceholderProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-2 px-2 py-6 text-center placeholder-enter',
        className,
      )}
    >
      {children && (
        <div
          className={clsx(iconSizeClasses[iconSize], variantClasses[variant])}
        >
          {children}
        </div>
      )}
      {header && (
        <h3 className="font-display font-semibold text-foreground text-sm">
          {header}
        </h3>
      )}
      {description && (
        <p className="max-w-md text-muted-foreground text-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
