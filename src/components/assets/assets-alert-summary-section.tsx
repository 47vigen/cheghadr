'use client'

import { useTranslations } from 'next-intl'

import { AlertSummaryCard } from '@/components/alerts/alert-summary-card'
import { Section } from '@/components/ui/section'

import { useRouter } from '@/i18n/navigation'

export interface AssetsAlertSummarySectionProps {
  activeCount: number
  triggeredCount: number
}

export function AssetsAlertSummarySection({
  activeCount,
  triggeredCount,
}: AssetsAlertSummarySectionProps) {
  const tAlerts = useTranslations('alerts')
  const router = useRouter()
  const isEmpty = activeCount === 0 && triggeredCount === 0

  // When no alerts exist, render a flat inline CTA strip without the Section
  // wrapper to save vertical space and reduce visual weight.
  if (isEmpty) {
    return (
      <div>
        <AlertSummaryCard
          activeCount={0}
          triggeredCount={0}
          onManage={() => router.push('/alerts')}
        />
      </div>
    )
  }

  return (
    <div>
      <Section header={tAlerts('title')}>
        <AlertSummaryCard
          activeCount={activeCount}
          triggeredCount={triggeredCount}
          onManage={() => router.push('/alerts')}
        />
      </Section>
    </div>
  )
}
