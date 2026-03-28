'use client'

import { useTranslations } from 'next-intl'

import { AlertListItem } from '@/components/alerts/alert-list-item'
import { CreateAlertForm } from '@/components/alerts/create-alert-form'
import { PageHeader } from '@/components/layout/page-header'
import { PageShell } from '@/components/layout/page-shell'
import { AlertsSkeleton } from '@/components/skeletons/alerts-skeleton'
import { ErrorState } from '@/components/ui/async-states'
import { Section } from '@/components/ui/section'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'

import { api } from '@/trpc/react'

export default function AlertsPage() {
  const t = useTranslations('alerts')
  const tCommon = useTranslations('common')
  useTelegramBackButton(true)

  const {
    data: alerts,
    isLoading,
    isError,
    error,
    refetch,
  } = api.alerts.list.useQuery()

  if (isLoading) {
    return <AlertsSkeleton />
  }

  if (isError) {
    return (
      <ErrorState
        header={t('loadError')}
        description={error.message}
        retryLabel={t('retryButton')}
        onRetry={() => void refetch()}
      />
    )
  }

  const activeAlerts = alerts?.filter((a) => a.isActive) ?? []
  const triggeredAlerts =
    alerts?.filter((a) => !a.isActive && a.triggeredAt) ?? []

  return (
    <PageShell>
      <PageHeader title={t('title')} backLabel={tCommon('back')} />

      <Section header={t('create')}>
        <CreateAlertForm />
      </Section>

      {activeAlerts.length > 0 && (
        <Section header={t('activeSection')}>
          {activeAlerts.map((alert) => (
            <AlertListItem key={alert.id} alert={alert} />
          ))}
        </Section>
      )}

      {triggeredAlerts.length > 0 && (
        <Section header={t('triggeredSection')}>
          {triggeredAlerts.map((alert) => (
            <AlertListItem key={alert.id} alert={alert} />
          ))}
        </Section>
      )}
    </PageShell>
  )
}
