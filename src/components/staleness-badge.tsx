'use client'

import { IconAlertTriangle, IconClock } from '@tabler/icons-react'

interface StalenessBadgeProps {
  snapshotAt: Date | null
  stale: boolean
}

export function StalenessBadge({ snapshotAt, stale }: StalenessBadgeProps) {
  if (!snapshotAt) {
    return (
      <div className="flex items-center gap-1.5 text-destructive text-sm">
        <IconAlertTriangle size={16} />
        <span>قیمت‌ها در دسترس نیست</span>
      </div>
    )
  }

  if (stale) {
    return (
      <div className="flex items-center gap-1.5 text-sm text-warning">
        <IconClock size={16} />
        <span>قیمت‌ها ممکن است قدیمی باشند</span>
      </div>
    )
  }

  return null
}
