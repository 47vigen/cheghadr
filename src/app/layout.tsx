import type { Metadata } from 'next'
import type { PropsWithChildren } from 'react'

import { Toaster } from 'sonner'

import '@/styles/globals.css'

import { ClientProviders } from '@/components/client-providers'

import { Vazirmatn } from '@/styles/fonts'
import { TRPCReactProvider } from '@/trpc/react'

export const metadata: Metadata = {
  title: 'چه‌قدر؟',
  description: 'ردیاب ارزش خالص دارایی',
}

export default function RootLayout(props: PropsWithChildren) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={Vazirmatn.variable}
    >
      <body>
        <TRPCReactProvider>
          <ClientProviders>
            {props.children}
            <Toaster richColors position="top-center" />
          </ClientProviders>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
