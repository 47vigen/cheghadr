'use client'

import Link from 'next/link'
import { SessionProvider, useSession } from 'next-auth/react'

function CtaButtons() {
  const { data: session, status } = useSession()

  if (status === 'loading' || session) return null

  return (
    <Link
      href="/login"
      className="label-compact flex h-12 w-full items-center justify-center border border-border text-foreground transition-all hover:border-foreground active:opacity-60"
    >
      Login with Telegram
    </Link>
  )
}

export function LandingCta() {
  return (
    <SessionProvider>
      <CtaButtons />
    </SessionProvider>
  )
}
