'use client'

import { useState } from 'react'

import { Button, Switch, toast } from '@heroui/react'
import { IconBell, IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import { AlertDeleteDialog } from '@/components/alerts/alert-delete-dialog'
import { Cell } from '@/components/ui/cell'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { formatIRT, getIntlLocale } from '@/lib/prices'
import { api } from '@/trpc/react'
import type { AlertEntry } from '@/types/api'

interface AlertListItemProps {
  alert: AlertEntry
}

export function AlertListItem({ alert }: AlertListItemProps) {
  const t = useTranslations('alerts')
  const locale = useLocale()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { notificationOccurred } = useTelegramHaptics()

  const utils = api.useUtils()

  const toggleMutation = api.alerts.toggle.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.alerts.list.invalidate()
      toast.success(t('toastToggled'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.danger(err.message || t('toastToggleError'))
    },
  })

  const threshold = formatIRT(Number(alert.thresholdIRT), locale)
  const directionLabel =
    alert.direction === 'ABOVE'
      ? t('above', { threshold })
      : t('below', { threshold })

  const title =
    alert.type === 'PORTFOLIO'
      ? `${t('portfolioTarget')} — ${directionLabel}`
      : `${alert.symbol} — ${directionLabel}`

  const subtitle = alert.triggeredAt
    ? t('triggeredAt', {
        time: new Intl.DateTimeFormat(getIntlLocale(locale), {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(alert.triggeredAt)),
      })
    : undefined

  // Triggered (inactive) alerts show an explicit re-enable button instead of
  // a toggle switch, making the affordance clear.
  const isTriggered = !alert.isActive && alert.triggeredAt !== null

  return (
    <>
      <Cell
        before={
          <IconBell
            size={18}
            className={alert.isActive ? 'text-accent' : 'text-muted-foreground'}
          />
        }
        subtitle={subtitle}
        after={
          <div className="flex items-center gap-1.5">
            {isTriggered ? (
              <Button
                size="sm"
                variant="ghost"
                onPress={() => toggleMutation.mutate({ id: alert.id })}
                isDisabled={toggleMutation.isPending}
              >
                {t('reEnable')}
              </Button>
            ) : (
              <Switch
                isSelected={alert.isActive}
                isDisabled={toggleMutation.isPending}
                onChange={() => toggleMutation.mutate({ id: alert.id })}
                size="sm"
                aria-label={title}
              >
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
              </Switch>
            )}
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => setDeleteOpen(true)}
              aria-label={t('deleteTitle')}
              className="text-destructive"
            >
              <IconTrash size={14} />
            </Button>
          </div>
        }
      >
        {title}
      </Cell>

      <AlertDeleteDialog
        alertId={alert.id}
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  )
}
