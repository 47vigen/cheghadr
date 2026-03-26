'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

interface SectionProps {
  header?: ReactNode
  trailing?: ReactNode
  children: ReactNode
  className?: string
  /** Extra classes for the header row (e.g. match inset with `Cell` rows). */
  headerRowClassName?: string
  variant?: 'default' | 'hero'
}

export function Section({
  header,
  trailing,
  children,
  className,
  headerRowClassName,
  variant = 'default',
}: SectionProps) {
  const isHero = variant === 'hero'

  return (
    <section className={className}>
      {(header != null || trailing != null) && (
        <div
          className={clsx(
            'mb-1 flex items-center justify-between px-2 py-1',
            headerRowClassName,
          )}
        >
          {header != null && (
            <h2
              className={clsx('section-header', isHero && 'text-foreground/90')}
            >
              {header}
            </h2>
          )}
          {trailing != null && (
            <div className="ms-auto flex items-center">{trailing}</div>
          )}
        </div>
      )}
      <div
        className={clsx(
          'border border-border p-2',
          isHero ? 'bg-card-elevated' : 'bg-card',
        )}
      >
        {children}
      </div>
    </section>
  )
}
