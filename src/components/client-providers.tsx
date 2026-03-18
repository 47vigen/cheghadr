'use client'

import dynamic from 'next/dynamic'
import type { PropsWithChildren } from 'react'

const TelegramProvider = dynamic(() => import('./telegram-provider'), {
  ssr: false,
})

export function ClientProviders(props: PropsWithChildren) {
  return <TelegramProvider>{props.children}</TelegramProvider>
}
