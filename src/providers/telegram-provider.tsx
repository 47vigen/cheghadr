'use client'

import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'

import WebApp from '@twa-dev/sdk'

import { usePlatform } from '@/hooks/use-platform'
import { useViewportHeight } from '@/hooks/use-viewport-height'

import { getRawInitData } from '@/utils/telegram'
import { applyTheme, resolveRuntimeTheme } from '@/utils/theme'

export default function TelegramProvider(props: PropsWithChildren) {
  const platform = usePlatform()

  useViewportHeight()

  useEffect(() => {
    if (!getRawInitData()) return
    WebApp.expand()
    WebApp.ready()

    if (['ios', 'android'].includes(platform)) {
      // WebApp.requestFullscreen()
    }
  }, [platform])

  const inTelegram = !!getRawInitData()

  useEffect(() => {
    if (inTelegram) {
      applyTheme(resolveRuntimeTheme(WebApp.colorScheme))
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const apply = () => applyTheme(mq.matches ? 'dark' : 'light')
      apply()
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [inTelegram])

  useEffect(() => {
    if (!inTelegram) return
    const handler = () => applyTheme(resolveRuntimeTheme(WebApp.colorScheme))
    WebApp.onEvent('themeChanged', handler)
    return () => WebApp.offEvent('themeChanged', handler)
  }, [inTelegram])

  return (
    <div className="h-full min-h-(--app-viewport-height) w-full">
      {props.children}
    </div>
  )
}
