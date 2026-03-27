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
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <ListRowsSkeleton count={3} hasSubtitle trailingValue={false} />
      </Section>
    </PageSkeleton>
  )
}
