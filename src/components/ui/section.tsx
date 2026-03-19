'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

interface SectionProps {
  header?: ReactNode
  children: ReactNode
  className?: string
  variant?: 'default' | 'hero'
}

export function Section({
  header,
  children,
  className,
  variant = 'default',
}: SectionProps) {
  const isHero = variant === 'hero'

  return (
    <section className={className}>
      {header != null && (
        <h2
          className={clsx(
            'section-header mb-0.5 px-2 py-0.5',
            isHero && 'text-foreground/90',
          )}
        >
          {header}
        </h2>
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
