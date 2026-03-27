'use client'

import type { ReactNode } from 'react'

import { Toast } from '@heroui/react'
import { SessionProvider } from 'next-auth/react'

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
            <Toast.Provider placement="top" />
          </ClientProviders>
        </LocaleProvider>
      </TRPCReactProvider>
    </SessionProvider>
  )
}
