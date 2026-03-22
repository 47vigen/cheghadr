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

      <div className="-mx-[var(--page-px)] border-border/80 border-b bg-background/90 px-[var(--page-px)] py-2">
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-16 shrink-0 rounded-sm" />
          ))}
        </div>
      </div>

      {Array.from({ length: 2 }, (_, sectionIdx) => (
        <Section key={sectionIdx} header={<SectionHeaderSkeleton />}>
          <ListRowsSkeleton count={5} hasSubtitle={false} />
        </Section>
      ))}
    </PageSkeleton>
  )
}
