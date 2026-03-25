'use client'

import { useEffect, useRef, useState } from 'react'

import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'

/* ─── Slide data ─────────────────────────────────────────── */

const SLIDE_COUNT = 4

/* ─── SVG Illustrations ──────────────────────────────────── */

function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[220px]"
      aria-hidden
    >
      {/* Coins stack */}
      <ellipse
        cx="100"
        cy="130"
        rx="40"
        ry="10"
        fill="currentColor"
        opacity="0.08"
      />
      <ellipse
        cx="100"
        cy="120"
        rx="36"
        ry="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />
      <ellipse
        cx="100"
        cy="110"
        rx="36"
        ry="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.5"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="36"
        ry="9"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        opacity="0.1"
      />
      <text
        x="100"
        y="104"
        textAnchor="middle"
        fontSize="10"
        fill="currentColor"
        opacity="0.6"
        fontFamily="monospace"
      >
        ＄
      </text>
      {/* Sparkle dots */}
      <circle cx="148" cy="60" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="155" cy="80" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="50" cy="70" r="3" fill="currentColor" opacity="0.5" />
      <circle cx="42" cy="90" r="2" fill="currentColor" opacity="0.3" />
      {/* Chart bars */}
      <rect
        x="60"
        y="80"
        width="12"
        height="30"
        rx="1"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="76"
        y="65"
        width="12"
        height="45"
        rx="1"
        fill="currentColor"
        opacity="0.2"
      />
      <rect
        x="92"
        y="50"
        width="12"
        height="60"
        rx="1"
        fill="currentColor"
        opacity="0.3"
      />
      <rect
        x="108"
        y="40"
        width="12"
        height="70"
        rx="1"
        fill="currentColor"
        opacity="0.4"
      />
      <rect
        x="124"
        y="55"
        width="12"
        height="55"
        rx="1"
        fill="currentColor"
        opacity="0.25"
      />
    </svg>
  )
}

function TrackIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[220px]"
      aria-hidden
    >
      {/* Portfolio rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(30, ${30 + i * 30})`}>
          <rect
            width="140"
            height="22"
            rx="0"
            fill="currentColor"
            opacity={0.05 + i * 0.03}
          />
          <circle cx="11" cy="11" r="9" fill="currentColor" opacity="0.2" />
          <rect
            x="28"
            y="6"
            width="40"
            height="4"
            rx="1"
            fill="currentColor"
            opacity="0.3"
          />
          <rect
            x="28"
            y="13"
            width="25"
            height="3"
            rx="1"
            fill="currentColor"
            opacity="0.15"
          />
          <rect
            x="110"
            y="6"
            width="22"
            height="4"
            rx="1"
            fill="currentColor"
            opacity={i % 2 === 0 ? 0.5 : 0.25}
          />
          <rect
            x="110"
            y="13"
            width="14"
            height="3"
            rx="1"
            fill="currentColor"
            opacity={i % 2 === 0 ? 0.35 : 0.15}
          />
        </g>
      ))}
      {/* Total line */}
      <line
        x1="30"
        y1="150"
        x2="170"
        y2="150"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
      <rect
        x="110"
        y="140"
        width="30"
        height="6"
        rx="1"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  )
}

function PricesIllustration() {
  const points = [50, 65, 45, 70, 55, 80, 60, 90, 75, 85, 95]
  const maxY = 100
  const w = 140
  const h = 70
  const xStep = w / (points.length - 1)
  const pathD = points
    .map(
      (y, i) =>
        `${i === 0 ? 'M' : 'L'} ${30 + i * xStep} ${30 + h - (y / maxY) * h}`,
    )
    .join(' ')

  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[220px]"
      aria-hidden
    >
      {/* Grid lines */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="30"
          y1={30 + (i / 3) * h}
          x2="170"
          y2={30 + (i / 3) * h}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.1"
        />
      ))}
      {/* Chart line */}
      <path
        d={pathD}
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={30 + (points.length - 1) * xStep}
        cy={30 + h - (points[points.length - 1]! / maxY) * h}
        r="4"
        fill="currentColor"
        opacity="0.8"
      />
      {/* Bell icon */}
      <g transform="translate(148, 120)">
        <path
          d="M10 2C10 2 6 5 6 10V14L4 16H16L14 14V10C14 5 10 2 10 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        <path
          d="M8 16C8 17.1 8.9 18 10 18C11.1 18 12 17.1 12 16"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  )
}

function LangIllustration() {
  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[200px]"
      aria-hidden
    >
      <text
        x="50"
        y="70"
        textAnchor="middle"
        fontSize="36"
        fill="currentColor"
        opacity="0.7"
        fontFamily="monospace"
      >
        A
      </text>
      <text
        x="150"
        y="70"
        textAnchor="middle"
        fontSize="36"
        fill="currentColor"
        opacity="0.7"
      >
        ا
      </text>
      <line
        x1="100"
        y1="20"
        x2="100"
        y2="100"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.2"
      />
    </svg>
  )
}

/* ─── Progress indicator ─────────────────────────────────── */

function ProgressSegments({
  total,
  current,
}: {
  total: number
  current: number
}) {
  return (
    <div className="flex w-full gap-1.5 px-4 pt-safe">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-0.5 flex-1 overflow-hidden bg-foreground/15"
          style={{ borderRadius: 0 }}
        >
          <div
            className="h-full bg-foreground transition-all"
            style={{
              width: i < current ? '100%' : i === current ? '100%' : '0%',
              opacity: i <= current ? 1 : 0,
              transitionDuration: '300ms',
            }}
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────────── */

export default function OnboardPage() {
  const t = useTranslations('onboard')
  const router = useRouter()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'fa'>('en')
  const [exiting, setExiting] = useState(false)

  const touchStartX = useRef<number | null>(null)

  const settingsQuery = api.user.getSettings.useQuery()
  const completeOnboarding = api.user.completeOnboarding.useMutation()

  // Auto-detect language
  useEffect(() => {
    if (typeof window === 'undefined') return
    const lang = navigator.language ?? ''
    setSelectedLocale(lang.startsWith('fa') ? 'fa' : 'en')
  }, [])

  // If already onboarded, redirect to /app
  useEffect(() => {
    if (settingsQuery.data?.isOnboarded) {
      router.replace('/app')
    }
  }, [settingsQuery.data, router])

  const goTo = (slide: number) => {
    if (slide < 0 || slide >= SLIDE_COUNT) return
    setCurrentSlide(slide)
  }

  const handleSkip = async () => {
    setExiting(true)
    await completeOnboarding.mutateAsync({})
    router.replace('/app')
  }

  const handleComplete = async () => {
    setExiting(true)
    await completeOnboarding.mutateAsync({ locale: selectedLocale })
    router.replace('/assets/add')
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
    if (Math.abs(dx) > 50) {
      goTo(currentSlide + (dx < 0 ? 1 : -1))
    }
    touchStartX.current = null
  }

  const slides = [
    {
      illustration: <WelcomeIllustration />,
      title: t('slide0Title'),
      sub: t('slide0Sub'),
    },
    {
      illustration: <TrackIllustration />,
      title: t('slide1Title'),
      sub: t('slide1Sub'),
    },
    {
      illustration: <PricesIllustration />,
      title: t('slide2Title'),
      sub: t('slide2Sub'),
    },
    {
      illustration: <LangIllustration />,
      title: t('slide3Title'),
      sub: t('slide3Sub'),
    },
  ]

  const slide = slides[currentSlide]

  return (
    <div
      className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground"
      style={{ opacity: exiting ? 0 : 1, transition: 'opacity 300ms ease' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top chrome */}
      <div className="safe-top relative z-20 flex items-start justify-between px-4 pt-4">
        <ProgressSegments total={SLIDE_COUNT} current={currentSlide} />
      </div>

      <div className="relative z-20 flex justify-end px-4 pt-2">
        <button
          type="button"
          onClick={handleSkip}
          disabled={completeOnboarding.isPending}
          className="label-compact text-muted-foreground transition-opacity hover:opacity-70 active:opacity-50"
        >
          {t('skip')}
        </button>
      </div>

      {/* Slide area — tap zones */}
      <div className="relative flex flex-1 flex-col" aria-live="polite">
        {/* Tap left to go back */}
        <button
          type="button"
          aria-label="Previous slide"
          className="absolute top-0 bottom-0 left-0 z-10 w-1/3"
          onClick={() => goTo(currentSlide - 1)}
          tabIndex={-1}
        />
        {/* Tap right to advance */}
        <button
          type="button"
          aria-label="Next slide"
          className="absolute top-0 right-0 bottom-0 z-10 w-1/3"
          onClick={() =>
            currentSlide < SLIDE_COUNT - 1 ? goTo(currentSlide + 1) : undefined
          }
          tabIndex={-1}
        />

        {/* Content */}
        <div
          key={currentSlide}
          className="relative z-20 flex flex-1 flex-col items-center justify-center gap-8 px-8 pt-4"
          style={{
            animation:
              'onboard-slide-in 320ms cubic-bezier(0.25,0.46,0.45,0.94) both',
          }}
        >
          {/* Illustration */}
          <div className="flex items-center justify-center text-foreground">
            {slide?.illustration}
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="font-bold font-display text-2xl tracking-tight">
              {slide?.title}
            </h1>
            <p className="max-w-xs text-muted-foreground text-sm leading-relaxed">
              {slide?.sub}
            </p>
          </div>

          {/* Language selector — only on last slide */}
          {currentSlide === SLIDE_COUNT - 1 && (
            <div className="flex gap-3">
              {(['en', 'fa'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLocale(lang)}
                  className={`flex h-12 w-32 items-center justify-center border font-display font-medium text-sm transition-all ${
                    selectedLocale === lang
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-transparent text-foreground hover:border-foreground/50'
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  {lang === 'en' ? t('langEn') : t('langFa')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative z-20 px-6 pb-10 pb-safe">
        {currentSlide < SLIDE_COUNT - 1 ? (
          <button
            type="button"
            onClick={() => goTo(currentSlide + 1)}
            className="label-compact flex w-full items-center justify-center border border-foreground bg-foreground py-4 text-background transition-opacity hover:opacity-80 active:opacity-60"
            style={{ borderRadius: 0 }}
          >
            {t('next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleComplete}
            disabled={completeOnboarding.isPending}
            className="label-compact flex w-full items-center justify-center border border-foreground bg-foreground py-4 text-background transition-opacity hover:opacity-80 active:opacity-60 disabled:opacity-50"
            style={{ borderRadius: 0 }}
          >
            {t('cta')}
          </button>
        )}
      </div>

      {/* Slide animation keyframes */}
      <style>{`
        @keyframes onboard-slide-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
