import { Skeleton } from '@heroui/react'

import {
  ListRowsSkeleton,
  PageSkeleton,
  SectionHeaderSkeleton,
} from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function PricesSkeleton() {
  return (
    <PageSkeleton>
      <Section header={<SectionHeaderSkeleton />} variant="hero">
        <div className="px-2 py-1.5">
          <Skeleton className="h-10 w-full" />
        </div>
      </Section>

      {Array.from({ length: 2 }, (_, sectionIdx) => (
        <Section key={sectionIdx} header={<SectionHeaderSkeleton />}>
          <ListRowsSkeleton count={5} hasSubtitle={false} />
        </Section>
      ))}
    </PageSkeleton>
  )
}
