'use client'

import { useEffect } from 'react'

import WebApp from '@twa-dev/sdk'

/**
 * Tracks `WebApp.viewportStableHeight` and writes it to the CSS custom
 * property `--tg-viewport-height` on `document.documentElement`. This lets
 * form pages constrain their height so content stays visible when the
 * mobile keyboard is open. No-op when outside Telegram.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    if (!WebApp.viewportStableHeight) return

    const update = () => {
      const height = WebApp.viewportStableHeight
      if (height) {
        document.documentElement.style.setProperty(
          '--tg-viewport-height',
          `${height}px`,
        )
      }
    }

    update()
    WebApp.onEvent('viewportChanged', update)

    return () => {
      WebApp.offEvent('viewportChanged', update)
    }
  }, [])
}
