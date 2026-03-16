'use client'

import type { PropsWithChildren } from 'react'

import dynamic from 'next/dynamic'

const TelegramProvider = dynamic(() => import('./telegram-provider'), {
  ssr: false,
})

export function ClientProviders(props: PropsWithChildren) {
  return <TelegramProvider>{props.children}</TelegramProvider>
}
