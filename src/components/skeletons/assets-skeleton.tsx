import { Skeleton } from '@heroui/react'

import {
  ListRowsSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function AssetsSkeleton() {
  return (
    <PageSkeleton>
      <Section header={<SectionHeaderSkeleton />} variant="hero">
        <div className="flex flex-col items-center gap-0.5 py-2">
          <Skeleton className="h-3 w-20" />
          <div className="flex items-baseline gap-1.5">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <div className="px-1 py-1">
          <Skeleton className="h-[140px] w-full" />
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <ListRowsSkeleton count={4} />
      </Section>
    </PageSkeleton>
  )
}
