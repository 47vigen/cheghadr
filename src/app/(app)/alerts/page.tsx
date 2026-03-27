'use client'

import { IconBellPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AlertListItem } from '@/components/alerts/alert-list-item'
import { CreateAlertForm } from '@/components/alerts/create-alert-form'
import { PageHeader } from '@/components/layout/page-header'
import { PageShell } from '@/components/layout/page-shell'
import { AlertsSkeleton } from '@/components/skeletons/alerts-skeleton'
import { ErrorState } from '@/components/ui/async-states'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'

import { api } from '@/trpc/react'

export default function AlertsPage() {
  const t = useTranslations('alerts')
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
      <PageHeader title={t('title')} backLabel={t('back')} />

      <div>
        <Section header={t('create')}>
          {alerts && alerts.length === 0 ? (
            <>
              <Placeholder
                variant="empty"
                iconSize="md"
                className="gap-1.5 py-4"
                header={t('noAlerts')}
                description={t('noAlertsDescription')}
              >
                <IconBellPlus />
              </Placeholder>
              <div className="mt-2">
                <CreateAlertForm />
              </div>
            </>
          ) : (
            <CreateAlertForm />
          )}
        </Section>
      </div>

      {activeAlerts.length > 0 && (
        <div>
          <Section header={t('activeSection')}>
            {activeAlerts.map((alert) => (
              <AlertListItem key={alert.id} alert={alert} />
            ))}
          </Section>
        </div>
      )}

      {triggeredAlerts.length > 0 && (
        <div>
          <Section header={t('triggeredSection')}>
            {triggeredAlerts.map((alert) => (
              <AlertListItem key={alert.id} alert={alert} />
            ))}
          </Section>
        </div>
      )}
    </PageShell>
  )
}
