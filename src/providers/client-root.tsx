'use client'

import type { ReactNode } from 'react'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'

import { ClientProviders } from '@/providers/client-providers'
import { LocaleProvider } from '@/providers/locale-provider'

import { TRPCReactProvider } from '@/trpc/react'

/**
 * ClientRoot wraps the entire app and is loaded with ssr: false.
 * This ensures the app renders only on the client, which is ideal for
 * Telegram Mini Apps where users access via webview (client-side).
 *
 * Provider order:
 *  SessionProvider (outermost — enables useSession in GuestLoginBanner)
 *    TRPCReactProvider (must wrap LocaleProvider for locale mutation)
 *      LocaleProvider (uses api.user.setPreferredLocale)
 *        ClientProviders (TelegramProvider)
 */
export function ClientRoot({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TRPCReactProvider>
        <LocaleProvider>
          <ClientProviders>
            {children}
            <Toaster richColors position="top-center" />
          </ClientProviders>
        </LocaleProvider>
      </TRPCReactProvider>
    </SessionProvider>
  )
}
