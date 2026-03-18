'use client'

import type { ReactNode } from 'react'

import { Button, Spinner } from '@heroui/react'
import { IconAlertTriangle } from '@tabler/icons-react'

import { Placeholder } from '@/components/ui/placeholder'

interface ErrorStateProps {
  header: string
  description?: string
  retryLabel: string
  onRetry: () => void
}

export function ErrorState({
  header,
  description,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <Placeholder
      variant="error"
      iconSize="lg"
      header={header}
      description={description}
      action={
        <Button variant="primary" onPress={onRetry}>
          {retryLabel}
        </Button>
      }
    >
      <IconAlertTriangle size={64} />
    </Placeholder>
  )
}

interface EmptyStateBaseProps {
  header: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyStateBase({
  header,
  description,
  action,
  icon,
}: EmptyStateBaseProps) {
  return (
    <Placeholder
      variant="empty"
      iconSize="md"
      header={header}
      description={description}
      action={action}
    >
      {icon}
    </Placeholder>
  )
}

interface RefreshIndicatorProps {
  isRefreshing: boolean
}

export function RefreshIndicator({ isRefreshing }: RefreshIndicatorProps) {
  if (!isRefreshing) return null

  return (
    <div className="refresh-indicator-enter flex justify-center py-2">
      <Spinner size="sm" />
    </div>
  )
}

interface LoadingStateProps {
  fullScreen?: boolean
}

export function LoadingState({ fullScreen = false }: LoadingStateProps) {
  return (
    <div
      className={
        fullScreen
          ? 'flex min-h-svh items-center justify-center'
          : 'flex items-center justify-center py-6'
      }
    >
      <Spinner size="lg" />
    </div>
  )
}
