'use client'

import type { ReactNode } from 'react'

import { Toaster } from 'sonner'

import { ClientProviders } from '@/components/client-providers'
import { LocaleProvider } from '@/components/locale-provider'
import { TRPCReactProvider } from '@/trpc/react'

/**
 * ClientRoot wraps the entire app and is loaded with ssr: false.
 * This ensures the app renders only on the client, which is ideal for
 * Telegram Mini Apps where users access via webview (client-side).
 */
export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <TRPCReactProvider>
        <ClientProviders>
          {children}
          <Toaster richColors position="top-center" />
        </ClientProviders>
      </TRPCReactProvider>
    </LocaleProvider>
  )
}
