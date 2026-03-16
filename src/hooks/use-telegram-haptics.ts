'use client'

import { useCallback } from 'react'

import WebApp from '@twa-dev/sdk'

interface HapticsAPI {
  impactOccurred: (
    style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
  ) => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

/**
 * Returns stable haptic feedback functions. All are no-ops when
 * `WebApp.HapticFeedback` is unavailable (outside Telegram).
 */
export function useTelegramHaptics(): HapticsAPI {
  const impactOccurred = useCallback(
    (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'medium') => {
      WebApp.HapticFeedback?.impactOccurred(style)
    },
    [],
  )

  const notificationOccurred = useCallback(
    (type: 'error' | 'success' | 'warning') => {
      WebApp.HapticFeedback?.notificationOccurred(type)
    },
    [],
  )

  const selectionChanged = useCallback(() => {
    WebApp.HapticFeedback?.selectionChanged()
  }, [])

  return { impactOccurred, notificationOccurred, selectionChanged }
}
