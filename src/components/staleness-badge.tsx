import { IconAlertTriangle, IconClock } from '@tabler/icons-react'
import { Caption } from '@telegram-apps/telegram-ui'

const STALE_AFTER_MINUTES = 60

interface StalenessBadgeProps {
  snapshotAt: Date | null
  stale: boolean
}

export function StalenessBadge({ snapshotAt, stale }: StalenessBadgeProps) {
  if (!snapshotAt) {
    return (
      <div className="flex items-center gap-1.5">
        <IconAlertTriangle size={14} className="text-tgui-destructive-text" />
        <Caption level="1" className="text-tgui-destructive-text">
          قیمت‌ها در دسترس نیست
        </Caption>
      </div>
    )
  }

  if (stale) {
    const minutesOld = Math.floor(
      (Date.now() - snapshotAt.getTime()) / 1000 / 60,
    )
    const isOverThreshold = minutesOld > STALE_AFTER_MINUTES

    if (!isOverThreshold) return null

    return (
      <div className="flex items-center gap-1.5">
        <IconClock size={14} className="text-tgui-hint" />
        <Caption level="1" className="text-tgui-hint">
          قیمت‌ها ممکن است قدیمی باشند
        </Caption>
      </div>
    )
  }

  return null
}
