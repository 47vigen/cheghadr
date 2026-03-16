import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Toaster } from 'sonner'

import '@/styles/globals.css'

import { ClientProviders } from '@/components/client-providers'
import { LocaleProvider } from '@/components/locale-provider'
import { Vazirmatn } from '@/styles/fonts'
import { TRPCReactProvider } from '@/trpc/react'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={Vazirmatn.variable}>
      <body>
        <LocaleProvider>
          <TRPCReactProvider>
            <ClientProviders>
              {children}
              <Toaster richColors position="top-center" />
            </ClientProviders>
          </TRPCReactProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}
