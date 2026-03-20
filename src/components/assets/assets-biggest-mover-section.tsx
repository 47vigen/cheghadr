'use client'

import { useTranslations } from 'next-intl'

import { BiggestMoverCard } from '@/components/portfolio/biggest-mover-card'
import { Section } from '@/components/ui/section'

import type { BiggestMover } from '@/lib/portfolio-utils'

export interface AssetsBiggestMoverSectionProps {
  biggestMover: BiggestMover | null
}

export function AssetsBiggestMoverSection({
  biggestMover,
}: AssetsBiggestMoverSectionProps) {
  const tBreakdown = useTranslations('breakdown')

  if (!biggestMover) return null

  return (
    <div>
      <Section header={tBreakdown('biggestMover')}>
        <BiggestMoverCard {...biggestMover} />
      </Section>
    </div>
  )
}
