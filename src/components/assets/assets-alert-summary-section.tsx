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

  return (
    <div>
      <Section header={tAlerts('sectionTitle')}>
        <AlertSummaryCard
          activeCount={activeCount}
          triggeredCount={triggeredCount}
          onManage={() => router.push('/alerts')}
        />
      </Section>
    </div>
  )
}
