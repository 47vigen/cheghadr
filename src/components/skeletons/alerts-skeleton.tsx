import { Skeleton } from '@heroui/react'

import {
  ListRowsSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function AlertsSkeleton() {
  return (
    <PageSkeleton>
      <Section header={<SectionHeaderSkeleton />} variant="hero">
        <div className="py-2 ps-1">
          <Skeleton className="h-8 w-40" />
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <div className="flex flex-col gap-3 p-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <ListRowsSkeleton count={3} hasSubtitle trailingValue={false} />
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <div className="flex items-center justify-between gap-3 px-1 py-2">
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-1 h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0" />
        </div>
      </Section>
    </PageSkeleton>
  )
}
