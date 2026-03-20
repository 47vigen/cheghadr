import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'

import '@/styles/globals.css'

import { ClientRootWrapper } from '@/providers/client-root-wrapper'

import { JetBrainsMono, Vazirmatn } from '@/styles/fonts'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
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
        <ClientRootWrapper>{children}</ClientRootWrapper>
      </body>
    </html>
  )
}
