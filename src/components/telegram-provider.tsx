'use client'

import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import { AppRoot } from '@telegram-apps/telegram-ui'
import WebApp from '@twa-dev/sdk'

import { usePlatform } from '@/hooks/use-platform'

export default function TelegramProvider(props: PropsWithChildren) {
  const platform = usePlatform()

  useEffect(() => {
    if (['ios', 'android'].includes(platform)) {
      WebApp.requestFullscreen()
    }
  }, [platform])

  return (
    <AppRoot
      className="h-full w-full"
      appearance={WebApp.colorScheme}
      platform={['macos', 'ios'].includes(platform) ? 'ios' : 'base'}
    >
      {props.children}
    </AppRoot>
  )
}
