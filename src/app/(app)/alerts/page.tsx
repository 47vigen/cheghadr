'use client'

import { useEffect, useState } from 'react'

import { Button, Switch, Text, toast } from '@heroui/react'
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
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'
import { isTelegramWebApp } from '@/utils/telegram'

export default function AlertsPage() {
  const t = useTranslations('alerts')
  const router = useRouter()
  const inTelegram = isTelegramWebApp()
  useTelegramBackButton(true)
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
      toast.danger(err.message || t('toastToggleError'))
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

      <div>
        <Section header={t('settings')}>
          <div className="flex items-start justify-between gap-3 px-1 py-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Text className="block font-medium text-sm leading-snug">
                {t('dailyDigest')}
              </Text>
              <Text className="block text-muted-foreground text-xs leading-relaxed">
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
