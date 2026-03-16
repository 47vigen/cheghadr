'use client'

import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'
import WebApp from '@twa-dev/sdk'

import { usePlatform } from '@/hooks/use-platform'
import { useViewportHeight } from '@/hooks/use-viewport-height'
import { getRawInitData } from '@/utils/telegram'

export default function TelegramProvider(props: PropsWithChildren) {
  const platform = usePlatform()
  const [appearance, setAppearance] = useState<'light' | 'dark'>(
    WebApp.colorScheme,
  )

  useViewportHeight()

  useEffect(() => {
    if (!getRawInitData()) return
    WebApp.expand()
    WebApp.ready()

    if (['ios', 'android'].includes(platform)) {
      // WebApp.requestFullscreen()
    }
  }, [platform])

  useEffect(() => {
    const handler = () => setAppearance(WebApp.colorScheme)

    WebApp.onEvent('themeChanged', handler)
    return () => WebApp.offEvent('themeChanged', handler)
  }, [])

  return (
    <AppRoot
      className="h-full w-full"
      appearance={appearance}
      platform={['macos', 'ios'].includes(platform) ? 'ios' : 'base'}
    >
      {props.children}
    </AppRoot>
  )
}
