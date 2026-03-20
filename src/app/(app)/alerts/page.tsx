'use client'

import { useEffect, useState } from 'react'

import { Switch, Text } from '@heroui/react'
import { IconBellPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AlertListItem } from '@/components/alerts/alert-list-item'
import { CreateAlertForm } from '@/components/alerts/create-alert-form'
import { AlertsSkeleton } from '@/components/skeletons/alerts-skeleton'
import { ErrorState } from '@/components/ui/async-states'
import { PageShell } from '@/components/ui/page-shell'
import { Placeholder } from '@/components/ui/placeholder'
import { Section } from '@/components/ui/section'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { api } from '@/trpc/react'

export default function AlertsPage() {
  const t = useTranslations('alerts')
  const tNav = useTranslations('nav')
  const { notificationOccurred } = useTelegramHaptics()
  const [digestEnabled, setDigestEnabled] = useState<boolean | null>(null)

  const {
    data: alerts,
    isLoading,
    isError,
    error,
    refetch,
  } = api.alerts.list.useQuery()

  const { data: settingsData } = api.user.getSettings.useQuery()

  useEffect(() => {
    if (settingsData && digestEnabled === null) {
      setDigestEnabled(settingsData.dailyDigestEnabled)
    }
  }, [settingsData, digestEnabled])

  const toggleDigestMutation = api.user.toggleDailyDigest.useMutation({
    onSuccess: (user) => {
      notificationOccurred('success')
      setDigestEnabled(user.dailyDigestEnabled)
      toast.success(t('toastToggled'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastToggleError'))
    },
  })

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
      <div>
        <Section header={tNav('alerts')} variant="hero">
          <div className="py-2 ps-1">
            <Text className="font-display font-semibold text-2xl">
              {t('title')}
            </Text>
          </div>
        </Section>
      </div>

      <div>
        <Section header={t('create')}>
          {alerts && alerts.length === 0 ? (
            <>
              <Placeholder
                variant="empty"
                iconSize="md"
                header={t('noAlerts')}
                description={t('noAlertsDescription')}
              >
                <IconBellPlus />
              </Placeholder>
              <div className="mt-3">
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

      <div>
        <Section header={t('settings')}>
          <div className="flex items-center justify-between gap-3 px-1 py-2">
            <div className="min-w-0">
              <Text className="font-medium text-sm">{t('dailyDigest')}</Text>
              <Text className="text-muted-foreground text-xs">
                {t('dailyDigestDescription')}
              </Text>
            </div>
            <Switch
              isSelected={
                digestEnabled ?? settingsData?.dailyDigestEnabled ?? false
              }
              isDisabled={
                toggleDigestMutation.isPending || digestEnabled === null
              }
              onChange={() =>
                toggleDigestMutation.mutate({
                  enabled: !(
                    digestEnabled ??
                    settingsData?.dailyDigestEnabled ??
                    false
                  ),
                })
              }
              size="sm"
              aria-label={t('dailyDigest')}
            >
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch>
          </div>
        </Section>
      </div>
    </PageShell>
  )
}
