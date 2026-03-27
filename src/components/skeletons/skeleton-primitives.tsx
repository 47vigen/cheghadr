import type { ReactNode } from 'react'

import { Skeleton } from '@heroui/react'

import { PageShell } from '@/components/layout/page-shell'

interface ListRowSkeletonProps {
  hasSubtitle?: boolean
  trailingValue?: boolean
}

function ListRowSkeleton({
  hasSubtitle = true,
  trailingValue = true,
}: ListRowSkeletonProps) {
  return (
    <div className="cell-row">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-4 w-24" />
        {hasSubtitle ? <Skeleton className="mt-0.5 h-3 w-16" /> : null}
      </div>
      {trailingValue ? (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
      ) : null}
    </div>
  )
}

interface ListRowsSkeletonProps {
  count: number
  hasSubtitle?: boolean
  trailingValue?: boolean
}

export function PageSkeleton({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>
}

export function SectionHeaderSkeleton() {
  return <Skeleton className="inline-block h-4 w-20" />
}

export function ListRowsSkeleton({
  count,
  hasSubtitle = true,
  trailingValue = true,
}: ListRowsSkeletonProps) {
  return (
    <div className="skeleton-row-stagger flex flex-col">
      {Array.from({ length: count }, (_, i) => (
        <ListRowSkeleton
          key={i}
          hasSubtitle={hasSubtitle}
          trailingValue={trailingValue}
        />
      ))}
    </div>
  )
}
