import { IconAlertTriangle, IconClock } from '@tabler/icons-react'
import { Banner } from '@telegram-apps/telegram-ui'

const STALE_AFTER_MINUTES = 60

interface StalenessBadgeProps {
  snapshotAt: Date | null
  stale: boolean
}

export function StalenessBadge({ snapshotAt, stale }: StalenessBadgeProps) {
  if (!snapshotAt) {
    return (
      <Banner
        type="section"
        before={
          <IconAlertTriangle size={20} className="text-tgui-destructive-text" />
        }
        header="قیمت‌ها در دسترس نیست"
        className="text-tgui-destructive-text"
      />
    )
  }

  if (stale) {
    const minutesOld = Math.floor(
      (Date.now() - snapshotAt.getTime()) / 1000 / 60,
    )
    const isOverThreshold = minutesOld > STALE_AFTER_MINUTES

    if (!isOverThreshold) return null

    return (
      <Banner
        type="inline"
        before={<IconClock size={20} className="text-tgui-hint" />}
        header="قیمت‌ها ممکن است قدیمی باشند"
        className="text-tgui-hint"
      />
    )
  }

  return null
}
