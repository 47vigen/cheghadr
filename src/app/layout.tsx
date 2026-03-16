import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '@/styles/globals.css'

import { ClientRootWrapper } from '@/components/client-root-wrapper'
import { Vazirmatn } from '@/styles/fonts'

export const metadata: Metadata = {
  title: 'Cheghadr?',
  description: 'Personal net worth tracker',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning className={Vazirmatn.variable}>
      <body>
        <ClientRootWrapper>{children}</ClientRootWrapper>
      </body>
    </html>
  )
}
