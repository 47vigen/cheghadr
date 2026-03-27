'use client'

import { useEffect, useState } from 'react'

import { Button, Switch, Text, toast } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { PageHeader } from '@/components/layout/page-header'
import { PageShell } from '@/components/layout/page-shell'
import { SettingsSkeleton } from '@/components/skeletons/settings-skeleton'
import { Section } from '@/components/ui/section'
import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { useLocaleContext } from '@/providers/locale-provider'
import { api } from '@/trpc/react'

export default function SettingsPage() {
  const t = useTranslations('settings')
  useTelegramBackButton(true)
  const { notificationOccurred } = useTelegramHaptics()
  const localeCtx = useLocaleContext()
  const [digestEnabled, setDigestEnabled] = useState<boolean | null>(null)

  const { data: settingsData, isLoading } = api.user.getSettings.useQuery()

  useEffect(() => {
    if (settingsData && digestEnabled === null) {
      setDigestEnabled(settingsData.dailyDigestEnabled)
    }
  }, [settingsData, digestEnabled])

  const toggleDigestMutation = api.user.toggleDailyDigest.useMutation({
    onSuccess: (user) => {
      notificationOccurred('success')
      setDigestEnabled(user.dailyDigestEnabled)
      toast.success(t('toastDigestUpdated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastDigestError'))
    },
  })

  if (isLoading) return <SettingsSkeleton />

  const locale = localeCtx?.locale ?? 'en'

  return (
    <PageShell>
      <PageHeader title={t('title')} backLabel={t('back')} />

      <div>
        <Section header={t('languageSection')}>
          <div className="flex gap-2 p-1">
            {(['en', 'fa'] as const).map((l) => (
              <Button
                key={l}
                variant={locale === l ? 'primary' : 'ghost'}
                fullWidth
                onPress={() => {
                  localeCtx?.setLocale(l)
                  toast.success(t('toastLocaleUpdated'))
                }}
              >
                {l === 'en' ? 'English' : 'فارسی'}
              </Button>
            ))}
          </div>
        </Section>
      </div>

      <div>
        <Section header={t('notificationsSection')}>
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
              onChange={(isSelected) =>
                toggleDigestMutation.mutate({ enabled: isSelected })
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
