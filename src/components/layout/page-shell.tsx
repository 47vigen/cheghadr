'use client'

import type { ReactNode } from 'react'

import { clsx } from 'clsx'

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return <div className={clsx('page-content', className)}>{children}</div>
}
