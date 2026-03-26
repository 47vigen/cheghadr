'use client'

import Link from 'next/link'

import { SessionProvider, useSession } from 'next-auth/react'

function CtaButtons({ footer }: { footer?: boolean }) {
  const { data: session, status } = useSession()

  const href = session ? '/app' : '/login'

  if (footer) {
    return status === 'loading' ? (
      <div className="h-10 w-32 bg-foreground/10" />
    ) : (
      <Link
        href={href}
        className="label-compact flex h-10 items-center justify-center border border-foreground bg-foreground px-8 text-background transition-opacity hover:opacity-80 active:opacity-60"
      >
        Open App
      </Link>
    )
  }

  if (status === 'loading') {
    return <div className="h-12 w-full bg-foreground/10" />
  }

  return (
    <>
      <Link
        href={href}
        className="label-compact flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-background transition-opacity hover:opacity-80 active:opacity-60"
      >
        Open App
      </Link>
      {!session && (
        <Link
          href="/login"
          className="label-compact flex h-12 w-full items-center justify-center border border-border text-foreground transition-all hover:border-foreground active:opacity-60"
        >
          Login with Telegram
        </Link>
      )}
    </>
  )
}

export function LandingCta({ footer }: { footer?: boolean }) {
  return (
    <SessionProvider>
      <CtaButtons footer={footer} />
    </SessionProvider>
  )
}
