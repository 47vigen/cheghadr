'use client'

import Link from 'next/link'

import { SessionProvider, useSession } from 'next-auth/react'

function CtaButtons({ footer }: { footer?: boolean }) {
  const { data: session, status } = useSession()

  if (footer) {
    return (
      <Link
        href="/app"
        className="label-compact flex h-10 items-center justify-center border border-foreground bg-foreground px-8 text-background transition-opacity hover:opacity-80 active:opacity-60"
      >
        Open App
      </Link>
    )
  }

  return (
    <>
      <Link
        href="/app"
        className="label-compact flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-background transition-opacity hover:opacity-80 active:opacity-60"
      >
        Open App
      </Link>
      {status !== 'loading' && !session && (
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
