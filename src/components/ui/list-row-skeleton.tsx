import { Skeleton } from '@heroui/react'

interface ListRowSkeletonProps {
  hasSubtitle?: boolean
  trailingValue?: boolean
}

export function ListRowSkeleton({
  hasSubtitle = true,
  trailingValue = true,
}: ListRowSkeletonProps) {
  return (
    <div className="cell-row">
      <Skeleton className="size-8 shrink-0" />
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
