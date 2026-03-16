'use client'

import type { PropsWithChildren } from 'react'

import { Toaster } from 'sonner'

import '@/styles/globals.css'

import dynamic from 'next/dynamic'

const TelegramProvider = dynamic(() => import('./telegram-provider'), {
  ssr: false,
})

export function ClientProviders(props: PropsWithChildren) {
  return (
    <TelegramProvider>
      {props.children}
      <Toaster richColors position="top-center" />
    </TelegramProvider>
  )
}
