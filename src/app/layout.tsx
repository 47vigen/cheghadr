import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import './globals.css'

import { TelegramProvider } from '@/components/telegram-provider'
import { ThemeProvider } from '@/components/theme-provider'

import { TRPCReactProvider } from '@/trpc/react'
import { cn } from '@/utils/style'

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
      className={cn(
        'antialiased',
        fontMono.variable,
        'font-sans',
        fontSans.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <TRPCReactProvider>
            <TelegramProvider>{children}</TelegramProvider>
          </TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
