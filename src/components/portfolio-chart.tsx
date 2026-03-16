'use client'

import { useEffect, useState } from 'react'

import { Placeholder } from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatIRT } from '@/lib/prices'

interface PortfolioChartProps {
  data: Array<{ date: Date; totalIRT: number }>
}

function formatChartDate(date: Date, locale: string): string {
  if (locale === 'fa') {
    return new Intl.DateTimeFormat('fa-IR', {
      month: 'short',
      day: 'numeric',
    }).format(date)
  }
  return new Intl.DateTimeFormat('en-US', {
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
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-section"
      style={{
        backgroundColor: 'var(--tgui--card_bg_color)',
        color: 'var(--tgui--text_color)',
        border: '1px solid var(--tgui--divider)',
      }}
    >
      <div className="text-tgui-hint text-xs">
        {formatChartDate(point.payload.date, locale)}
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
  const [accentColor, setAccentColor] = useState('#2481cc')
  const [dividerColor, setDividerColor] = useState('rgba(0,0,0,0.1)')

  // Read TGUI CSS variables after mount so we get the correct theme colors
  useEffect(() => {
    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--tgui--accent_text_color').trim()
    const divider = style.getPropertyValue('--tgui--divider').trim()
    if (accent) setAccentColor(accent)
    if (divider) setDividerColor(divider)
  }, [])

  if (data.length < 2) {
    return (
      <Placeholder
        description={t('chartEmpty')}
        className="py-6"
      />
    )
  }

  const chartData = data.map((d) => ({
    date: d.date instanceof Date ? d.date : new Date(d.date),
    totalIRT: d.totalIRT,
    label: formatChartDate(
      d.date instanceof Date ? d.date : new Date(d.date),
      locale,
    ),
  }))

  return (
    <div dir="ltr" className="px-2 py-4">
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--tgui--hint_color)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={<ChartTooltip locale={locale} />}
            cursor={{ stroke: dividerColor, strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="totalIRT"
            stroke={accentColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: accentColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
