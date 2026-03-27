import { Skeleton } from '@heroui/react'

import {
  ListRowsSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function AddAssetSkeleton() {
  return (
    <PageSkeleton>
      <Section>
        <div className="px-2 py-1.5">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </Section>

      <Section header={<SectionHeaderSkeleton />}>
        <ListRowsSkeleton count={6} trailingValue={false} />
      </Section>
    </PageSkeleton>
  )
}
