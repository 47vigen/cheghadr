'use client'

import { useState } from 'react'

import { Button, Modal, Spinner, Switch, Text } from '@heroui/react'
import type { Alert } from '@prisma/client'
import { IconBell, IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { formatIRT } from '@/lib/prices'
import { api } from '@/trpc/react'

interface AlertListItemProps {
  alert: Alert
}

export function AlertListItem({ alert }: AlertListItemProps) {
  const t = useTranslations('alerts')
  const locale = useLocale()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { notificationOccurred, impactOccurred } = useTelegramHaptics()

  const utils = api.useUtils()

  const toggleMutation = api.alerts.toggle.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.alerts.list.invalidate()
      toast.success(t('toastToggled'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastToggleError'))
    },
  })

  const deleteMutation = api.alerts.delete.useMutation({
    onSuccess: () => {
      impactOccurred('medium')
      void utils.alerts.list.invalidate()
      setDeleteOpen(false)
      toast.success(t('toastDeleted'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastDeleteError'))
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
        time: new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(alert.triggeredAt)),
      })
    : undefined

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

      <Modal>
        <Modal.Backdrop isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
          <Modal.Container>
            <Modal.Dialog
              className="sm:max-w-[360px]"
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            >
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Section>
                  <Text className="mb-4 text-center text-muted-foreground text-sm">
                    {t('deleteConfirm')}
                  </Text>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={() => setDeleteOpen(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onPress={() => deleteMutation.mutate({ id: alert.id })}
                      isDisabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Spinner size="sm" color="current" />
                      ) : (
                        t('delete')
                      )}
                    </Button>
                  </div>
                </Section>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
