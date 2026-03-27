import { Skeleton } from '@heroui/react'

import {
  PageSkeleton,
  SectionHeaderSkeleton,
} from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function SettingsSkeleton() {
  return (
    <PageSkeleton>
      <Section header={<SectionHeaderSkeleton />}>
        <div className="flex gap-2 p-1">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
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
