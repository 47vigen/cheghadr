import type { ReactNode } from 'react'

import { Skeleton } from '@heroui/react'

import { ListRowSkeleton } from '@/components/ui/list-row-skeleton'
import { PageShell } from '@/components/ui/page-shell'

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
