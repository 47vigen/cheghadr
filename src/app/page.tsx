'use client'

import { useMemo } from 'react'

import { useSession } from 'next-auth/react'
import { useLocale, useTranslations } from 'next-intl'

import { Link } from '@/i18n/navigation'
import type { PriceItem } from '@/lib/prices'
import {
  findBySymbol,
  formatChange,
  formatIRT,
  getLocalizedItemName,
  parsePriceSnapshot,
} from '@/lib/prices'
import { api } from '@/trpc/react'

/* ─── Featured symbols ───────────────────────────────────── */

const FEATURED_SYMBOLS = [
  'USD',
  'EUR',
  'USDT',
  'BTC',
  'ETH',
  'GBP',
  'AED',
  'BNB',
  'XRP',
  'SOL',
]

/* ─── Ticker item ────────────────────────────────────────── */

function TickerItem({ item, locale }: { item: PriceItem; locale: string }) {
  const name = getLocalizedItemName(item, locale)
  const sellPrice = Number.parseFloat(item.sell_price ?? '0')
  const change = formatChange(item.change, locale)

  return (
    <div className="flex items-center justify-between border-border border-b px-4 py-3">
      {/* Left: symbol avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-card font-bold font-display text-muted-foreground text-xs">
          {item.base_currency?.symbol?.slice(0, 3) ??
            item.symbol?.split('-')[0]?.slice(0, 3) ??
            '—'}
        </div>
        <span className="font-medium text-sm leading-none">{name}</span>
      </div>

      {/* Right: price + change */}
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="font-display font-semibold text-sm tabular-nums"
          dir="ltr"
        >
          {Number.isNaN(sellPrice) ? '—' : formatIRT(sellPrice, locale)}
        </span>
        {change && (
          <span
            className="label-compact tabular-nums"
            style={{
              color: change.positive ? 'var(--success)' : 'var(--danger)',
            }}
          >
            {change.text}
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Live price ticker ──────────────────────────────────── */

function LiveTicker({ items, locale }: { items: PriceItem[]; locale: string }) {
  if (items.length === 0) return null

  // Duplicate for seamless loop
  const doubled = [...items, ...items]

  return (
    <div
      className="relative overflow-hidden"
      style={{ height: `${Math.min(items.length, 6) * 57}px` }}
      aria-label="Live market prices"
    >
      {/* Fade top / bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8"
        style={{
          background:
            'linear-gradient(to bottom, var(--background), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8"
        style={{
          background: 'linear-gradient(to top, var(--background), transparent)',
        }}
      />

      <div
        className="ticker-track"
        style={{
          animationDuration: `${items.length * 2.5}s`,
        }}
      >
        {doubled.map((item, idx) => (
          <TickerItem
            // biome-ignore lint/suspicious/noArrayIndexKey: duplicated list for loop
            key={`${item.symbol}-${idx}`}
            item={item}
            locale={locale}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Feature card ───────────────────────────────────────── */

function FeatureCard({
  number,
  title,
  sub,
}: {
  number: string
  title: string
  sub: string
}) {
  return (
    <div className="flex gap-4 border-border border-b py-5 last:border-b-0">
      <span className="shrink-0 font-display font-medium text-muted-foreground text-xs">
        {number}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="font-display font-semibold text-sm">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{sub}</p>
      </div>
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */

export default function LandingPage() {
  const t = useTranslations('landing')
  const locale = useLocale()
  const { data: session } = useSession()

  const pricesQuery = api.prices.latest.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const featuredItems = useMemo<PriceItem[]>(() => {
    if (!pricesQuery.data?.data) return []
    const all = parsePriceSnapshot(pricesQuery.data.data)
    return FEATURED_SYMBOLS.flatMap((sym) => {
      const found = findBySymbol(all, sym)
      return found ? [found] : []
    })
  }, [pricesQuery.data])

  const appHref = session ? '/app' : '/login'

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
        {/* Decorative grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          aria-hidden
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, var(--foreground) 0px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, var(--foreground) 0px, transparent 1px, transparent 48px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div
          className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center"
          style={{ animation: 'fade-in 600ms ease-out both' }}
        >
          {/* App name */}
          <div className="flex flex-col gap-1">
            <h1
              className="font-bold font-display text-[clamp(2.5rem,12vw,5rem)] leading-none tracking-tight"
              lang="fa"
            >
              چه‌قدر؟
            </h1>
            <span className="font-display text-muted-foreground text-xs uppercase tracking-[0.2em]">
              Cheghadr
            </span>
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-1.5">
            <p className="font-medium text-base leading-snug">{t('tagline')}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('subTagline')}
            </p>
          </div>

          {/* CTA */}
          <div
            className="flex w-full flex-col gap-2.5"
            style={{ animation: 'fade-in 600ms 200ms ease-out both' }}
          >
            <Link
              href={appHref}
              className="label-compact flex w-full items-center justify-center border border-foreground bg-foreground py-4 text-background transition-opacity hover:opacity-80 active:opacity-60"
              style={{ borderRadius: 0 }}
            >
              {t('openApp')}
            </Link>
            {!session && (
              <Link
                href="/login"
                className="label-compact flex w-full items-center justify-center border border-border py-4 text-foreground transition-all hover:border-foreground active:opacity-60"
                style={{ borderRadius: 0 }}
              >
                {t('loginCta')}
              </Link>
            )}
          </div>
        </div>

        {/* Scroll hint */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ animation: 'fade-in 800ms 600ms ease-out both' }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-8 w-px bg-foreground/20" />
            <span className="label-compact text-[0.55rem] text-muted-foreground/60">
              scroll
            </span>
          </div>
        </div>
      </section>

      {/* ── Live Price Ticker ─────────────────────────────── */}
      <section
        className="px-0 py-8"
        style={{ animation: 'fade-in 500ms 100ms ease-out both' }}
      >
        <div className="mb-4 flex items-center justify-between px-4">
          <h2 className="label-compact text-muted-foreground">
            {t('tickerTitle')}
          </h2>
          {pricesQuery.data && !pricesQuery.data.stale && (
            <span
              className="label-compact flex items-center gap-1.5"
              style={{ color: 'var(--success)' }}
            >
              <span
                className="block h-1.5 w-1.5 rounded-full"
                style={{
                  background: 'var(--success)',
                  animation: 'pulse-soft 2s ease-in-out infinite',
                }}
              />
              LIVE
            </span>
          )}
        </div>

        <div className="border-border border-t">
          {pricesQuery.isLoading ? (
            <div className="flex flex-col">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border-border border-b px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-card" />
                    <div className="h-3 w-24 bg-card" />
                  </div>
                  <div className="h-3 w-16 bg-card" />
                </div>
              ))}
            </div>
          ) : (
            <LiveTicker items={featuredItems} locale={locale} />
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section
        className="px-4 py-8"
        style={{ animation: 'fade-in 500ms 200ms ease-out both' }}
      >
        <h2 className="label-compact mb-4 text-muted-foreground">Features</h2>
        <div className="border-border border-t">
          <FeatureCard
            number="01"
            title={t('feature1Title')}
            sub={t('feature1Sub')}
          />
          <FeatureCard
            number="02"
            title={t('feature2Title')}
            sub={t('feature2Sub')}
          />
          <FeatureCard
            number="03"
            title={t('feature3Title')}
            sub={t('feature3Sub')}
          />
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────── */}
      <section className="border-border border-t px-4 py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold font-display text-lg" lang="fa">
              چه‌قدر؟
            </span>
            <span className="label-compact text-muted-foreground">
              Personal net worth tracker
            </span>
          </div>
          <Link
            href={appHref}
            className="label-compact flex items-center justify-center border border-foreground bg-foreground px-8 py-3 text-background transition-opacity hover:opacity-80 active:opacity-60"
            style={{ borderRadius: 0 }}
          >
            {t('openApp')}
          </Link>
        </div>
      </section>

      {/* Ticker animation */}
      <style>{`
        .ticker-track {
          animation: ticker-up linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes ticker-up {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  )
}
