import type { ReactNode } from 'react'

// Root layout: minimal pass-through. The [locale] layout provides <html>/<body>
// with locale-specific lang/dir attributes. Adding them here would nest two
// <html> tags and break RTL support.
// Required by Next.js when a not-found page or other root-level file exists.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
