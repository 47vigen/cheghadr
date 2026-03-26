'use client'

import { useEffect, useState } from 'react'

import { useLocale, useTranslations } from 'next-intl'
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Placeholder } from '@/components/ui/placeholder'

import { formatIRT, getIntlLocale } from '@/lib/prices'

interface PortfolioChartProps {
  data: Array<{ date: Date; totalIRT: number }>
}

function formatChartDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function ChartTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: Date } }>
  locale: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  if (!point) return null
  const d =
    point.payload.date instanceof Date
      ? point.payload.date
      : new Date(point.payload.date)
  return (
    <div className="border border-border bg-surface px-1.5 py-1 font-display text-xs shadow-[0_2px_8px_oklch(0_0_0/0.12)]">
      <div className="text-muted-foreground text-xs">
        {formatChartDate(d, locale)}
      </div>
      <div className="font-semibold tabular-nums">
        {formatIRT(point.value, locale)}
      </div>
    </div>
  )
}

export function PortfolioChart({ data }: PortfolioChartProps) {
  const t = useTranslations('assets')
  const locale = useLocale()
  const [accentColor, setAccentColor] = useState('var(--accent)')
  const [dividerColor, setDividerColor] = useState('var(--border)')

  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--accent').trim()
    const border = style.getPropertyValue('--border').trim()
    if (accent) setAccentColor(accent)
    if (border) setDividerColor(border)
  }, [])

  if (data.length < 2) {
    return <Placeholder description={t('chartEmpty')} className="py-6" />
  }

  const chartData = data.map((d) => {
    const date = d.date instanceof Date ? d.date : new Date(d.date)
    return { date, dateMillis: date.getTime(), totalIRT: d.totalIRT }
  })

  const minTime = Math.min(...chartData.map((d) => d.dateMillis))
  const maxTime = Math.max(...chartData.map((d) => d.dateMillis))

  const gradientId = 'portfolio-chart-gradient'

  return (
    <div dir="ltr" className="chart-mount px-1 py-1">
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={0.25} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            type="number"
            dataKey="dateMillis"
            domain={[minTime, maxTime]}
            scale="time"
            tickFormatter={(ms) =>
              formatChartDate(new Date(ms as number), locale)
            }
            tick={{
              fontSize: 12,
              fill: 'var(--muted-foreground)',
              fontFamily: 'var(--font-display)',
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            content={<ChartTooltip locale={locale} />}
            cursor={{ stroke: dividerColor, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="totalIRT"
            stroke={accentColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: accentColor }}
            isAnimationActive
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
