'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { Button, Spinner } from '@heroui/react'
import { useTranslations } from 'next-intl'

import { LoadingState } from '@/components/ui/async-states'

import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'

/* ─── Constants ──────────────────────────────────────────── */

const SLIDE_COUNT = 4

/* ─── SVG Illustrations ──────────────────────────────────── */

function WelcomeIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[200px]"
      aria-hidden
    >
      {/* Shadow */}
      <ellipse
        cx="100"
        cy="132"
        rx="38"
        ry="8"
        fill="currentColor"
        opacity="0.06"
      />
      {/* Coin stack - bottom */}
      <ellipse
        cx="100"
        cy="122"
        rx="34"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.04"
        opacity="0.35"
      />
      {/* Coin stack - mid */}
      <ellipse
        cx="100"
        cy="112"
        rx="34"
        ry="8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.06"
        opacity="0.5"
      />
      {/* Coin stack - top */}
      <ellipse
        cx="100"
        cy="102"
        rx="34"
        ry="8"
        stroke="currentColor"
        strokeWidth="2"
        fill="currentColor"
        fillOpacity="0.1"
        opacity="0.7"
      />
      <text
        x="100"
        y="106"
        textAnchor="middle"
        fontSize="9"
        fill="currentColor"
        opacity="0.55"
        fontFamily="monospace"
        fontWeight="bold"
      >
        IRT
      </text>
      {/* Rising bars */}
      <rect
        x="56"
        y="82"
        width="10"
        height="28"
        fill="currentColor"
        opacity="0.12"
      />
      <rect
        x="70"
        y="68"
        width="10"
        height="42"
        fill="currentColor"
        opacity="0.18"
      />
      <rect
        x="84"
        y="52"
        width="10"
        height="58"
        fill="currentColor"
        opacity="0.24"
      />
      <rect
        x="98"
        y="42"
        width="10"
        height="68"
        fill="#4ade80"
        opacity="0.72"
      />
      <rect
        x="112"
        y="56"
        width="10"
        height="54"
        fill="currentColor"
        opacity="0.22"
      />
      <rect
        x="126"
        y="44"
        width="10"
        height="66"
        fill="currentColor"
        opacity="0.28"
      />
      {/* Sparkles */}
      <circle cx="150" cy="50" r="2.5" fill="currentColor" opacity="0.45" />
      <circle cx="158" cy="68" r="1.5" fill="currentColor" opacity="0.28" />
      <circle cx="46" cy="58" r="2.5" fill="currentColor" opacity="0.45" />
      <circle cx="38" cy="76" r="1.5" fill="currentColor" opacity="0.28" />
    </svg>
  )
}

function TrackIllustration() {
  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[200px]"
      aria-hidden
    >
      {/* Four asset rows */}
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(24, ${24 + i * 32})`}>
          <rect
            width="152"
            height="24"
            fill="currentColor"
            opacity={0.04 + i * 0.02}
          />
          {/* Avatar circle */}
          <circle
            cx="12"
            cy="12"
            r="9"
            fill={i === 0 ? '#4ade80' : 'currentColor'}
            opacity={i === 0 ? 0.55 : 0.14 + i * 0.04}
          />
          {/* Name bar */}
          <rect
            x="28"
            y="7"
            width={32 + i * 4}
            height="4"
            rx="1"
            fill="currentColor"
            opacity="0.28"
          />
          {/* Subtitle bar */}
          <rect
            x="28"
            y="14"
            width={20 + i * 3}
            height="3"
            rx="1"
            fill="currentColor"
            opacity="0.14"
          />
          {/* Value bar */}
          <rect
            x={152 - 28 - (i % 2 === 0 ? 24 : 18)}
            y="7"
            width={i % 2 === 0 ? 24 : 18}
            height="4"
            rx="1"
            fill={i % 2 === 0 ? '#4ade80' : 'currentColor'}
            opacity={i % 2 === 0 ? 0.75 : 0.22}
          />
          {/* Change bar */}
          <rect
            x={152 - 20 - (i % 2 === 0 ? 14 : 10)}
            y="14"
            width={i % 2 === 0 ? 14 : 10}
            height="3"
            rx="1"
            fill="currentColor"
            opacity={i % 2 === 0 ? 0.35 : 0.14}
          />
        </g>
      ))}
      {/* Total row */}
      <line
        x1="24"
        y1="154"
        x2="176"
        y2="154"
        stroke="currentColor"
        strokeWidth="0.75"
        opacity="0.18"
      />
      <rect
        x="124"
        y="145"
        width="36"
        height="6"
        rx="1"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}

function PricesIllustration() {
  const points = [42, 58, 38, 68, 50, 76, 55, 88, 70, 82, 94]
  const w = 140
  const h = 72
  const xStep = w / (points.length - 1)
  const pathD = points
    .map(
      (y, i) =>
        `${i === 0 ? 'M' : 'L'} ${30 + i * xStep} ${28 + h - (y / 100) * h}`,
    )
    .join(' ')

  return (
    <svg
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[200px]"
      aria-hidden
    >
      {/* Grid */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1="30"
          y1={28 + (i / 3) * h}
          x2="170"
          y2={28 + (i / 3) * h}
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.08"
        />
      ))}
      {/* Filled area under line */}
      <path
        d={`${pathD} L ${30 + (points.length - 1) * xStep} ${28 + h} L 30 ${28 + h} Z`}
        fill="currentColor"
        opacity="0.06"
      />
      {/* Line */}
      <path
        d={pathD}
        stroke="#4ade80"
        strokeWidth="2"
        opacity="0.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Terminal dot */}
      <circle
        cx={30 + (points.length - 1) * xStep}
        cy={28 + h - (points[points.length - 1]! / 100) * h}
        r="4"
        fill="#4ade80"
        opacity="1"
      />
      {/* Bell */}
      <g transform="translate(152, 118)" opacity="0.55">
        <path
          d="M9 1C9 1 5 4 5 9v4L3 15h12l-2-2V9C13 4 9 1 9 1Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M7 15c0 1.1.9 2 2 2s2-.9 2-2"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="13" cy="3" r="2.5" fill="currentColor" opacity="0.8" />
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
      className="w-full max-w-[180px]"
      aria-hidden
    >
      {/* Left: Roman A */}
      <text
        x="52"
        y="72"
        textAnchor="middle"
        fontSize="52"
        fill="currentColor"
        opacity="0.6"
        fontFamily="monospace"
        fontWeight="700"
      >
        A
      </text>
      {/* Divider */}
      <line
        x1="100"
        y1="18"
        x2="100"
        y2="102"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
      />
      {/* Right: Arabic Alef Madda */}
      <text
        x="148"
        y="72"
        textAnchor="middle"
        fontSize="52"
        fill="currentColor"
        opacity="0.6"
      >
        آ
      </text>
    </svg>
  )
}

/* ─── Progress segments ──────────────────────────────────── */

function ProgressSegments({
  total,
  current,
}: {
  total: number
  current: number
}) {
  return (
    <div className="flex w-full gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="h-0.5 flex-1 overflow-hidden bg-foreground/15">
          <div
            className="h-full bg-foreground"
            style={{
              width: i <= current ? '100%' : '0%',
              transition: i === current ? 'width 0ms' : 'none',
            }}
          />
        </div>
      ))}
    </div>
  )
}

/* ─── Onboard page ───────────────────────────────────────── */

export default function OnboardPage() {
  const t = useTranslations('onboard')
  const router = useRouter()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideDir, setSlideDir] = useState<'fwd' | 'bwd'>('fwd')
  const [selectedLocale, setSelectedLocale] = useState<'en' | 'fa'>('en')
  const [exiting, setExiting] = useState(false)

  const touchStartX = useRef<number | null>(null)

  const settingsQuery = api.user.getSettings.useQuery()
  const completeOnboarding = api.user.completeOnboarding.useMutation()

  // Auto-detect language from browser
  useEffect(() => {
    if (typeof window === 'undefined') return
    setSelectedLocale((navigator.language ?? '').startsWith('fa') ? 'fa' : 'en')
  }, [])

  // Guard: already onboarded
  useEffect(() => {
    if (settingsQuery.data?.isOnboarded) {
      router.replace('/app')
    }
  }, [settingsQuery.data, router])

  const goTo = (slide: number) => {
    if (slide < 0 || slide >= SLIDE_COUNT) return
    setSlideDir(slide > currentSlide ? 'fwd' : 'bwd')
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
    if (Math.abs(dx) > 48) goTo(currentSlide + (dx < 0 ? 1 : -1))
    touchStartX.current = null
  }

  const slides = useMemo(
    () => [
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
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const slide = slides[currentSlide]
  const animClass = slideDir === 'fwd' ? 'slide-in-fwd' : 'slide-in-bwd'

  // Show spinner while checking onboard status
  if (settingsQuery.isLoading) {
    return <LoadingState fullScreen />
  }

  return (
    <div
      className="relative flex min-h-svh flex-col overflow-hidden bg-background text-foreground"
      style={{ opacity: exiting ? 0 : 1, transition: 'opacity 250ms ease' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Top chrome ──────────────────────────────────── */}
      <div className="relative z-20 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <ProgressSegments total={SLIDE_COUNT} current={currentSlide} />
      </div>

      <div className="relative z-20 flex justify-end px-4 pt-2">
        <Button
          variant="ghost"
          size="sm"
          onPress={handleSkip}
          isDisabled={completeOnboarding.isPending}
          className="label-compact text-muted-foreground"
        >
          {t('skip')}
        </Button>
      </div>

      {/* ── Slide area ──────────────────────────────────── */}
      <div
        className="relative flex flex-1 flex-col"
        aria-live="polite"
        aria-atomic="true"
      >
        {/* Tap-left zone: go back */}
        <button
          type="button"
          aria-label="Previous slide"
          className="absolute top-0 bottom-0 left-0 z-10 w-1/3"
          onClick={() => goTo(currentSlide - 1)}
          tabIndex={-1}
        />
        {/* Tap-right zone: advance */}
        <button
          type="button"
          aria-label="Next slide"
          className="absolute top-0 right-0 bottom-0 z-10 w-1/3"
          onClick={() =>
            currentSlide < SLIDE_COUNT - 1 && goTo(currentSlide + 1)
          }
          tabIndex={-1}
        />

        {/* Slide content */}
        <div
          key={currentSlide}
          className={`relative z-20 flex flex-1 flex-col items-center justify-center gap-8 px-8 pt-4 ${animClass}`}
        >
          {/* Illustration */}
          <div className="flex items-center justify-center text-foreground">
            <div
              className="flex items-center justify-center bg-card/50 p-6"
              style={{ minWidth: '200px', minHeight: '160px' }}
            >
              {slide?.illustration}
            </div>
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

          {/* Language picker — last slide only */}
          {currentSlide === SLIDE_COUNT - 1 && (
            <div className="flex gap-3">
              {(['en', 'fa'] as const).map((lang) => (
                <Button
                  key={lang}
                  variant={selectedLocale === lang ? 'primary' : 'outline'}
                  size="md"
                  onPress={() => setSelectedLocale(lang)}
                  className="w-32 font-display"
                >
                  {lang === 'en' ? t('langEn') : t('langFa')}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom CTA ──────────────────────────────────── */}
      <div className="relative z-20 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        {currentSlide < SLIDE_COUNT - 1 ? (
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onPress={() => goTo(currentSlide + 1)}
            className="label-compact h-14"
          >
            {t('next')}
          </Button>
        ) : (
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onPress={handleComplete}
            isDisabled={completeOnboarding.isPending}
            className="label-compact h-14"
          >
            {completeOnboarding.isPending ? (
              <Spinner size="sm" color="current" />
            ) : (
              t('cta')
            )}
          </Button>
        )}
      </div>

      {/* Horizontal slide animations */}
      <style>{`
        .slide-in-fwd {
          animation: onboard-in-fwd 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        .slide-in-bwd {
          animation: onboard-in-bwd 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
        }
        @keyframes onboard-in-fwd {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes onboard-in-bwd {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
