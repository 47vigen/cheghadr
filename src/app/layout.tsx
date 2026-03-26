import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'

import '@/styles/globals.css'

import { JetBrainsMono, Vazirmatn } from '@/styles/fonts'

export const metadata: Metadata = {
  title: {
    default: 'Cheghadr? — Personal Net Worth Tracker',
    template: '%s | Cheghadr?',
  },
  description:
    'Track your net worth in Iranian Toman. Monitor crypto, forex, gold and more — in Persian or English.',
  keywords: [
    'net worth tracker',
    'portfolio tracker',
    'Iranian Toman',
    'crypto',
    'forex',
    'gold',
    'Telegram Mini App',
    'cheghadr',
  ],
  openGraph: {
    title: 'Cheghadr? — Personal Net Worth Tracker',
    description:
      'Track your net worth in Iranian Toman. Monitor crypto, forex, gold and more — in Persian or English.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary',
    title: 'Cheghadr? — Personal Net Worth Tracker',
    description:
      'Track your net worth in Iranian Toman. Monitor crypto, forex, gold and more.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${Vazirmatn.variable} ${JetBrainsMono.variable}`}
    >
      <body>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
