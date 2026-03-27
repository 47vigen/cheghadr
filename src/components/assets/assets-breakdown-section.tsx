'use client'

import dynamic from 'next/dynamic'

import { useTranslations } from 'next-intl'

import { DynamicLoader } from '@/components/ui/dynamic-loader'
import { Section } from '@/components/ui/section'

import type { PortfolioBreakdownData } from '@/types/api'

const PortfolioBreakdown = dynamic(
  () =>
    import('@/components/portfolio/portfolio-breakdown').then((m) => ({
      default: m.PortfolioBreakdown,
    })),
  { ssr: false, loading: () => <DynamicLoader height={200} /> },
)

export interface AssetsBreakdownSectionProps {
  breakdownData: PortfolioBreakdownData | undefined
  assetCount: number
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}

export function AssetsBreakdownSection({
  breakdownData,
  assetCount,
  selectedCategory,
  onCategorySelect,
}: AssetsBreakdownSectionProps) {
  const tBreakdown = useTranslations('breakdown')

  if (!breakdownData || assetCount === 0) return null

  return (
    <div>
      <Section header={tBreakdown('title')}>
        <PortfolioBreakdown
          data={breakdownData.categories}
          totalIRT={breakdownData.totalIRT}
          selectedCategory={selectedCategory}
          onCategorySelect={onCategorySelect}
        />
      </Section>
    </div>
  )
}
