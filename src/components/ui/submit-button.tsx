'use client'

import { useEffect, useRef } from 'react'

import { Button, Spinner } from '@heroui/react'
import WebApp from '@twa-dev/sdk'

import { isTelegramWebApp } from '@/utils/telegram'

export interface SubmitButtonProps {
  label: string
  isLoading?: boolean
  isDisabled?: boolean
  onPress?: () => void
  className?: string
}

/**
 * Polymorphic submit button.
 * - In Telegram Mini App: controls WebApp.MainButton (renders nothing to DOM).
 * - In browser: renders a full-width HeroUI Button with loading state.
 */
export function SubmitButton({
  label,
  isLoading,
  isDisabled,
  onPress,
  className,
}: SubmitButtonProps) {
  if (isTelegramWebApp()) {
    return (
      <TelegramMainButton
        label={label}
        isLoading={!!isLoading}
        isDisabled={!!isDisabled}
        onPress={onPress}
      />
    )
  }

  return (
    <Button
      variant="primary"
      fullWidth
      size="lg"
      className={className}
      onPress={onPress}
      isDisabled={isDisabled || isLoading}
      isPending={isLoading}
    >
      {({ isPending }) =>
        isPending ? <Spinner size="sm" color="current" /> : label
      }
    </Button>
  )
}

interface TelegramMainButtonProps {
  label: string
  isLoading: boolean
  isDisabled: boolean
  onPress?: () => void
}

function TelegramMainButton({
  label,
  isLoading,
  isDisabled,
  onPress,
}: TelegramMainButtonProps) {
  // Stable ref so click handler always calls the latest onPress
  const onPressRef = useRef(onPress)
  useEffect(() => {
    onPressRef.current = onPress
  }, [onPress])

  // Mount / label change: show button and register click handler
  useEffect(() => {
    const btn = WebApp.MainButton
    if (!btn) return
    btn.setText(label)
    btn.show()
    const handler = () => onPressRef.current?.()
    btn.onClick(handler)
    return () => {
      btn.offClick(handler)
      btn.hide()
    }
  }, [label])

  // Loading state
  useEffect(() => {
    const btn = WebApp.MainButton
    if (!btn) return
    if (isLoading) {
      btn.showProgress(true)
    } else {
      btn.hideProgress()
    }
  }, [isLoading])

  // Disabled state
  useEffect(() => {
    const btn = WebApp.MainButton
    if (!btn) return
    if (isDisabled) {
      btn.disable()
    } else {
      btn.enable()
    }
  }, [isDisabled])

  // Renders nothing — the native Telegram UI handles display
  return null
}
