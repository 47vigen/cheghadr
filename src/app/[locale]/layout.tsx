import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { hasLocale } from 'next-intl'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { Toaster } from 'sonner'

import '@/styles/globals.css'

import { ClientProviders } from '@/components/client-providers'
import { routing } from '@/i18n/routing'
import { Vazirmatn } from '@/styles/fonts'
import { TRPCReactProvider } from '@/trpc/react'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const messages = await getMessages()

  const dir = locale === 'fa' ? 'rtl' : 'ltr'

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={Vazirmatn.variable}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <TRPCReactProvider>
            <ClientProviders>
              {children}
              <Toaster richColors position="top-center" />
            </ClientProviders>
          </TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
