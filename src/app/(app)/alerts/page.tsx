'use client'

import { Button } from '@heroui/react'
import { IconArrowLeft, IconBellPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { AlertListItem } from '@/components/alerts/alert-list-item'
import { CreateAlertForm } from '@/components/alerts/create-alert-form'
import { PageShell } from '@/components/layout/page-shell'
import { AlertsSkeleton } from '@/components/skeletons/alerts-skeleton'
import { ErrorState } from '@/components/ui/async-states'
import { Cell } from '@/components/ui/cell'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'
import { isTelegramWebApp } from '@/utils/telegram'

export default function AlertsPage() {
  const t = useTranslations('alerts')
  const router = useRouter()
  const inTelegram = isTelegramWebApp()
  useTelegramBackButton(true)

  const {
    data: alerts,
    isLoading,
    isError,
    error,
    refetch,
  } = api.alerts.list.useQuery()

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

  if (isLoading) {
    return <AlertsSkeleton />
  }

  const activeAlerts = alerts?.filter((a) => a.isActive) ?? []
  const triggeredAlerts =
    alerts?.filter((a) => !a.isActive && a.triggeredAt) ?? []

  return (
    <PageShell>
      {!inTelegram && (
        <div>
          <Section>
            <Cell
              before={
                <Button
                  isIconOnly
                  variant="ghost"
                  size="md"
                  aria-label={t('back')}
                  onPress={() => router.back()}
                >
                  <IconArrowLeft size={24} />
                </Button>
              }
            >
              {t('title')}
            </Cell>
          </Section>
        </div>
      )}
      {inTelegram && (
        <div className="px-3 pt-3 pb-1">
          <h2 className="section-header mb-0.5">{t('title')}</h2>
        </div>
      )}

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
