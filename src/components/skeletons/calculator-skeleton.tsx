import { Skeleton } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { PageSkeleton } from '@/components/skeletons/skeleton-primitives'
import { Section } from '@/components/ui/section'

export function CalculatorSkeleton() {
  const t = useTranslations('calculator')
  return (
    <PageSkeleton>
      <Section header={t('title')} variant="hero">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={`cell-row ${i === 1 ? 'justify-center' : ''}`}
          >
            <Skeleton className={i === 1 ? 'size-10' : 'h-11 w-full'} />
          </div>
        ))}
      </Section>

      <Section header={t('resultTitle')}>
        <div className="px-2 py-1.5">
          <Skeleton className="h-8 w-40" />
        </div>
      </Section>
    </PageSkeleton>
  )
}
