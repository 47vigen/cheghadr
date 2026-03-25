import { Skeleton } from '@heroui/react'

import { PageSkeleton } from '@/components/skeletons/skeleton-primitives'

export function CalculatorSkeleton() {
  return (
    <PageSkeleton>
      {/* Converter card skeleton */}
      <div>
        <div className="mb-1.5 px-2">
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="overflow-hidden rounded-2xl bg-card-elevated p-3">
          {/* From selector */}
          <Skeleton className="h-12 w-full rounded-xl" />

          {/* Swap row */}
          <div className="flex items-center px-2 py-2">
            <div className="h-px flex-1 bg-border/40" />
            <Skeleton className="mx-3 size-7 rounded-lg" />
            <div className="h-px flex-1 bg-border/40" />
          </div>

          {/* To selector */}
          <Skeleton className="h-12 w-full rounded-xl" />

          {/* Divider */}
          <div className="my-3 border-border/40 border-t" />

          {/* Amount input */}
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Result card skeleton */}
      <div>
        <div className="mb-1.5 px-2">
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="flex flex-col items-center gap-2 overflow-hidden rounded-2xl bg-card px-4 py-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </PageSkeleton>
  )
}
