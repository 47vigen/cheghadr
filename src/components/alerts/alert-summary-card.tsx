'use client'

import { Button, Text } from '@heroui/react'
import { IconBell, IconBellPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

interface AlertSummaryCardProps {
  activeCount: number
  triggeredCount: number
  onManage: () => void
}

export function AlertSummaryCard({
  activeCount,
  triggeredCount,
  onManage,
}: AlertSummaryCardProps) {
  const t = useTranslations('alerts')

  if (activeCount === 0 && triggeredCount === 0) {
    return (
      <div className="flex items-center justify-between gap-2 px-1 py-1">
        <div className="flex items-center gap-2">
          <IconBellPlus size={16} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Text className="text-muted-foreground text-sm">
              {t('ctaTitle')}
            </Text>
          </div>
        </div>
        <Button size="sm" variant="secondary" onPress={onManage}>
          {t('create')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <div className="flex items-center gap-2">
        <IconBell
          size={16}
          className={
            triggeredCount > 0 ? 'shrink-0 text-warning' : 'shrink-0 text-accent'
          }
        />
        <div className="min-w-0">
          <Text className="font-medium text-sm">
            {t('activeAlerts', { count: activeCount })}
          </Text>
          {triggeredCount > 0 && (
            <Text className="text-warning text-xs">
              {triggeredCount} {t('triggered')}
            </Text>
          )}
        </div>
      </div>
      <Button size="sm" variant="secondary" onPress={onManage}>
        {t('manage')}
      </Button>
    </div>
  )
}
