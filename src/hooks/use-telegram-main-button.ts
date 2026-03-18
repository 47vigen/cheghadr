'use client'

import { useEffect, useRef } from 'react'

import WebApp from '@twa-dev/sdk'

interface MainButtonConfig {
  text: string
  onClick: () => void
  isVisible?: boolean
  isLoading?: boolean
}

/**
 * Wires up the Telegram MainButton lifecycle for a page. Follows the same
 * stable-ref pattern as `useTelegramBackButton`. No-op when outside Telegram.
 */
export function useTelegramMainButton({
  text,
  onClick,
  isVisible = true,
  isLoading = false,
}: MainButtonConfig): void {
  const onClickRef = useRef(onClick)
  useEffect(() => {
    onClickRef.current = onClick
  }, [onClick])

  useEffect(() => {
    if (!WebApp.MainButton) return

    if (!isVisible) {
      WebApp.MainButton.hide()
      return () => {
        WebApp.MainButton?.hide()
      }
    }

    const handler = () => onClickRef.current()
    WebApp.MainButton.setText(text)
    WebApp.MainButton.show()
    WebApp.MainButton.onClick(handler)

    return () => {
      WebApp.MainButton?.offClick(handler)
      WebApp.MainButton?.hide()
    }
  }, [isVisible, text])

  useEffect(() => {
    if (!WebApp.MainButton || !isVisible) return

    if (isLoading) {
      WebApp.MainButton.showProgress()
    } else {
      WebApp.MainButton.hideProgress()
    }

    return () => {
      WebApp.MainButton?.hideProgress()
    }
  }, [isLoading, isVisible])
}
