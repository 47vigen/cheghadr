import { unstable_cache } from 'next/cache'

import type { PriceItem } from '@/lib/prices'
import {
  findBySymbol,
  formatChange,
  formatIRT,
  getLocalizedItemName,
} from '@/lib/prices'
import { db } from '@/server/db'
import { getCachedPriceSnapshot } from '@/server/price-cache'

import { LandingCta } from './_landing-cta'

const getLandingSnapshot = unstable_cache(
  () => getCachedPriceSnapshot(db),
  ['landing-snapshot'],
  { revalidate: 1800 },
)

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

function TickerItem({ item }: { item: PriceItem }) {
  const name = getLocalizedItemName(item, 'en')
  const sellPrice = Number.parseFloat(item.sell_price ?? '0')
  const change = formatChange(item.change, 'en')
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
          {Number.isNaN(sellPrice) ? '—' : `${formatIRT(sellPrice, 'en')} T`}
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

/* ─── Infinite vertical ticker ───────────────────────────── */

function LiveTicker({ items }: { items: PriceItem[] }) {
  if (items.length === 0) return null

  const doubled = [...items, ...items]
  const visibleRows = Math.min(items.length, 7)
  const rowH = 57

  return (
    <section
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
          <TickerItem key={`${item.symbol}-${idx}`} item={item} />
        ))}
      </div>
    </section>
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

export default async function LandingPage() {
  const snapshot = await getLandingSnapshot()

  const featuredItems: PriceItem[] = snapshot
    ? FEATURED_SYMBOLS.flatMap((sym) => {
        const found = findBySymbol(snapshot.prices, sym)
        return found ? [found] : []
      })
    : []

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
          ?
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
              style={{ fontSize: 'clamp(2.75rem, 14vw, 5.5rem)' }}
            >
              Cheghadr?
            </h1>
            <span className="font-display text-muted-foreground text-xs uppercase tracking-[0.25em]">
              چه‌قدر؟
            </span>
          </div>

          {/* Tagline */}
          <div className="flex flex-col gap-2">
            <p className="font-medium text-base leading-snug">
              Your personal net worth, at a glance
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Track assets, follow live prices, and get alerts — in Persian or
              English
            </p>
          </div>

          {/* CTAs */}
          <div
            className="flex w-full flex-col gap-2"
            style={{ animation: 'fade-in 500ms 180ms ease-out both' }}
          >
            <LandingCta />
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
            Live Market Prices
          </h2>
        </div>

        <div className="border-border border-t">
          <LiveTicker items={featuredItems} />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="px-4 pt-4 pb-6">
        <h2 className="label-compact mb-3 text-muted-foreground">Features</h2>
        <div className="border-border border-t">
          <FeatureCard
            number="01"
            title="Track Your Net Worth"
            sub="Add assets across crypto, forex, gold, and more. See your total portfolio value in Iranian Toman, updated in real time."
          />
          <FeatureCard
            number="02"
            title="Live Market Prices"
            sub="Browse prices for hundreds of assets. Prices refresh automatically so you always have the latest data."
          />
          <FeatureCard
            number="03"
            title="Smart Price Alerts"
            sub="Set alerts for any asset — get notified the moment a price crosses your target, above or below."
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-border border-t px-4 py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold font-display text-lg">Cheghadr?</span>
            <span className="label-compact text-muted-foreground">
              Personal net worth tracker
            </span>
          </div>
          <LandingCta footer />
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
