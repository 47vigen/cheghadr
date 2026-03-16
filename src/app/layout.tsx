import type { ReactNode } from 'react'

// Root layout: minimal pass-through. The [locale] layout provides <html>/<body>.
// Required by Next.js when a not-found page or other root-level file exists.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children
}
