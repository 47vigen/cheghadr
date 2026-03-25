'use client'

import { useMemo } from 'react'

import { Skeleton } from '@heroui/react'
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

/* ─── Featured symbols (priority order) ─────────────────── */

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

/* ─── Ticker row ─────────────────────────────────────────── */

function TickerItem({
  item,
  locale,
  tomanAbbr,
}: {
  item: PriceItem
  locale: string
  tomanAbbr: string
}) {
  const name = getLocalizedItemName(item, locale)
  const sellPrice = Number.parseFloat(item.sell_price ?? '0')
  const change = formatChange(item.change, locale)
  const sym =
    item.base_currency?.symbol?.slice(0, 4) ??
    item.symbol?.split('-')[0]?.slice(0, 4) ??
    '—'

  return (
    <div className="flex cursor-default items-center justify-between border-border border-b px-4 py-3 transition-colors hover:bg-card">
      {/* Symbol avatar + name */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border bg-card font-bold font-display text-[0.6rem] text-muted-foreground uppercase tracking-tight">
          {sym}
        </div>
        <span className="font-medium text-sm leading-none">{name}</span>
      </div>

      {/* Price + change */}
      <div className="flex flex-col items-end gap-0.5">
        <span
          className="font-display font-semibold text-sm tabular-nums"
          dir="ltr"
        >
          {Number.isNaN(sellPrice)
            ? '—'
            : `${formatIRT(sellPrice, locale)} ${tomanAbbr}`}
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

/* ─── Skeleton rows while loading ────────────────────────── */

function TickerSkeleton() {
  return (
    <div className="flex flex-col">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between border-border border-b px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Infinite vertical ticker ───────────────────────────── */

function LiveTicker({
  items,
  locale,
  tomanAbbr,
}: {
  items: PriceItem[]
  locale: string
  tomanAbbr: string
}) {
  if (items.length === 0) return null

  // Duplicate list for seamless infinite scroll
  const doubled = [...items, ...items]
  const visibleRows = Math.min(items.length, 7)
  const rowH = 57 // px per row (py-3 top+bottom = 24px + content ~33px)

  return (
    <div
      role="region"
      aria-label="Live market prices"
      className="relative overflow-hidden"
      style={{ height: `${visibleRows * rowH}px` }}
    >
      {/* Edge fades */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10"
        style={{
          background:
            'linear-gradient(to bottom, var(--background), transparent)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10"
        style={{
          background: 'linear-gradient(to top, var(--background), transparent)',
        }}
        aria-hidden
      />

      {/* Scrolling track */}
      <div
        className="ticker-track"
        style={{ animationDuration: `${items.length * 2.8}s` }}
      >
        {doubled.map((item, idx) => (
          <TickerItem
            // biome-ignore lint/suspicious/noArrayIndexKey: duplicated list for seamless loop
            key={`${item.symbol}-${idx}`}
            item={item}
            locale={locale}
            tomanAbbr={tomanAbbr}
          />
        ))}
      </div>
    </div>
  )
}

/* ─── Feature list item ──────────────────────────────────── */

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
    <div className="flex gap-5 border-border border-b py-5 last:border-b-0">
      <span className="shrink-0 font-display font-medium text-muted-foreground text-xs">
        {number}
      </span>
      <div className="flex flex-col gap-1.5">
        <h3 className="font-display font-semibold text-sm">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{sub}</p>
      </div>
    </div>
  )
}

/* ─── Landing page ───────────────────────────────────────── */

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

  const tomanAbbr = t('tomanAbbr')
  const appHref = session ? '/app' : '/login'

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-16">
        {/* Dot grid texture */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(circle, var(--border) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            opacity: 0.6,
          }}
        />

        {/* Decorative large glyph */}
        <div
          className="pointer-events-none absolute top-1/2 right-[-0.1em] -translate-y-1/2 select-none font-bold font-display text-foreground leading-none"
          style={{
            fontSize: 'clamp(16rem, 55vw, 28rem)',
            opacity: 0.025,
            userSelect: 'none',
          }}
          aria-hidden
        >
          {locale === 'fa' ? '؟' : '?'}
        </div>

        {/* Hero content */}
        <div
          className="relative z-10 flex w-full max-w-sm flex-col items-center gap-6 text-center"
          style={{ animation: 'fade-in 500ms ease-out both' }}
        >
          {/* App name */}
          <div className="flex flex-col items-center gap-1">
            <h1
              className="font-bold font-display leading-none tracking-tight"
              lang={locale === 'fa' ? 'fa' : undefined}
              style={{ fontSize: 'clamp(2.75rem, 14vw, 5.5rem)' }}
            >
              {locale === 'fa' ? 'چه‌قدر؟' : 'Cheghadr?'}
            </h1>
            {locale !== 'fa' && (
              <span className="font-display text-muted-foreground text-xs uppercase tracking-[0.25em]">
                چه‌قدر؟
              </span>
            )}
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2">
            <p className="font-medium text-base leading-snug">{t('tagline')}</p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {t('subTagline')}
            </p>
          </div>

          {/* CTAs */}
          <div
            className="flex w-full flex-col gap-2"
            style={{ animation: 'fade-in 500ms 180ms ease-out both' }}
          >
            <Link
              href={appHref}
              className="label-compact flex h-12 w-full items-center justify-center border border-foreground bg-foreground text-background transition-opacity hover:opacity-80 active:opacity-60"
            >
              {t('openApp')}
            </Link>
            {!session && (
              <Link
                href="/login"
                className="label-compact flex h-12 w-full items-center justify-center border border-border text-foreground transition-all hover:border-foreground active:opacity-60"
              >
                {t('loginCta')}
              </Link>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ animation: 'fade-in 500ms 700ms ease-out both' }}
          aria-hidden
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-px bg-foreground/20" />
            <span className="label-compact text-[0.5rem] text-muted-foreground/50 tracking-[0.15em]">
              SCROLL
            </span>
          </div>
        </div>
      </section>

      {/* ── Live Price Ticker ─────────────────────────────── */}
      <section className="py-8">
        <div className="mb-3 flex items-center justify-between px-4">
          <h2 className="label-compact text-muted-foreground">
            {t('tickerTitle')}
          </h2>
          {pricesQuery.data?.stale === false && (
            <span
              className="label-compact flex items-center gap-1.5"
              style={{ color: 'var(--success)' }}
            >
              <span
                className="block h-1.5 w-1.5 rounded-full bg-[--success]"
                style={{ animation: 'pulse-soft 2s ease-in-out infinite' }}
              />
              LIVE
            </span>
          )}
        </div>

        <div className="border-border border-t">
          {pricesQuery.isLoading ? (
            <TickerSkeleton />
          ) : (
            <LiveTicker
              items={featuredItems}
              locale={locale}
              tomanAbbr={tomanAbbr}
            />
          )}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-4 pt-4 pb-6">
        <h2 className="label-compact mb-3 text-muted-foreground">
          {t('featuresTitle')}
        </h2>
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

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-border border-t px-4 py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-0.5">
            <span
              className="font-bold font-display text-lg"
              lang={locale === 'fa' ? 'fa' : undefined}
            >
              {locale === 'fa' ? 'چه‌قدر؟' : 'Cheghadr?'}
            </span>
            <span className="label-compact text-muted-foreground">
              Personal net worth tracker
            </span>
          </div>
          <Link
            href={appHref}
            className="label-compact flex h-10 items-center justify-center border border-foreground bg-foreground px-8 text-background transition-opacity hover:opacity-80 active:opacity-60"
          >
            {t('openApp')}
          </Link>
        </div>
      </footer>

      {/* Ticker CSS */}
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
