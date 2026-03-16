import type { ReactNode } from 'react'

// Root layout: provides required <html>/<body> tags for error pages and API routes.
// The [locale] layout provides its own <html>/<body> with locale-specific config.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
