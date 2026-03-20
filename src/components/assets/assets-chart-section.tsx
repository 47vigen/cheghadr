'use client'

import dynamic from 'next/dynamic'

import { useTranslations } from 'next-intl'

import { DynamicLoader } from '@/components/dynamic-loader'
import { Section } from '@/components/ui/section'

import type { PortfolioHistoryData } from '@/types/api'

const PortfolioChart = dynamic(
  () =>
    import('@/components/portfolio/portfolio-chart').then((m) => ({
      default: m.PortfolioChart,
    })),
  { ssr: false, loading: () => <DynamicLoader height={140} /> },
)

export interface AssetsChartSectionProps {
  historyData: PortfolioHistoryData | undefined
}

export function AssetsChartSection({ historyData }: AssetsChartSectionProps) {
  const t = useTranslations('assets')

  if (!historyData) return null

  return (
    <div>
      <Section header={t('portfolioChart')}>
        <PortfolioChart data={historyData} />
      </Section>
    </div>
  )
}
