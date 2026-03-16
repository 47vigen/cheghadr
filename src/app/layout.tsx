import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import type { ReactNode } from 'react'

import { Toaster } from 'sonner'

import './globals.css'

import { TelegramProvider } from '@/components/telegram-provider'

import { TRPCReactProvider } from '@/trpc/react'

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
  display: 'swap',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'چه‌قدر؟',
  description: 'ردیاب ارزش خالص دارایی',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={vazirmatn.variable}
    >
      <body>
        <TRPCReactProvider>
          <TelegramProvider>{children}</TelegramProvider>
        </TRPCReactProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
