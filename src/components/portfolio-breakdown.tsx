'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import {
  Pie,
  Cell as PieCell,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { getCategoryColor } from '@/lib/category-colors'
import { formatIRT, getIntlLocale } from '@/lib/prices'

interface BreakdownCategory {
  category: string
  valueIRT: number
  percentage: number
}

interface PortfolioBreakdownProps {
  data: BreakdownCategory[]
  totalIRT: number
  selectedCategory: string | null
  onCategorySelect: (category: string | null) => void
}

function DonutTooltip({
  active,
  payload,
  locale,
}: {
  active?: boolean
  payload?: Array<{ value: number; name: string; payload: BreakdownCategory }>
  locale: string
}) {
  const t = useTranslations('categories')
  const intlLocale = getIntlLocale(locale)

  if (!active || !payload?.length) return null
  const entry = payload[0]
  if (!entry) return null

  const pct = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
  }).format(entry.payload.percentage)

  return (
    <div className="border border-border bg-surface px-2 py-1.5 font-display text-xs shadow-[0_2px_8px_oklch(0_0_0/0.12)]">
      <div className="font-medium">
        {t(entry.payload.category as Parameters<typeof t>[0])}
      </div>
      <div className="text-muted-foreground tabular-nums">
        {pct}% · {formatIRT(entry.payload.valueIRT, locale)}
      </div>
    </div>
  )
}

export function PortfolioBreakdown({
  data,
  totalIRT,
  selectedCategory,
  onCategorySelect,
}: PortfolioBreakdownProps) {
  const t = useTranslations('categories')
  const tBreakdown = useTranslations('breakdown')
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)
  const { selectionChanged } = useTelegramHaptics()

  const handleCellClick = (category: string) => {
    selectionChanged()
    onCategorySelect(selectedCategory === category ? null : category)
  }

  return (
    <div className="py-2">
      <div dir="ltr" className="chart-mount relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="valueIRT"
              nameKey="category"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={data.length > 1 ? 2 : 0}
              strokeWidth={0}
            >
              {data.map((entry) => {
                const color = getCategoryColor(entry.category)
                const isSelected = selectedCategory === entry.category
                const isOtherSelected =
                  selectedCategory !== null &&
                  selectedCategory !== entry.category
                return (
                  <PieCell
                    key={entry.category}
                    fill={color}
                    opacity={isOtherSelected ? 0.35 : 1}
                    stroke={isSelected ? 'var(--foreground)' : 'none'}
                    strokeWidth={isSelected ? 2 : 0}
                    style={{ cursor: 'pointer', outline: 'none' }}
                    onClick={() => handleCellClick(entry.category)}
                  />
                )
              })}
            </Pie>
            <Tooltip
              content={<DonutTooltip locale={locale} />}
              wrapperStyle={{ zIndex: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label — absolute positioned over SVG */}
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          style={{ top: 0 }}
          aria-hidden
        >
          <Text className="font-display text-muted-foreground text-xs">
            {tBreakdown('title')}
          </Text>
          <Text className="font-display font-semibold text-sm tabular-nums">
            {formatIRT(totalIRT, locale)}
          </Text>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1.5 px-2">
        {data.map((entry) => {
          const color = getCategoryColor(entry.category)
          const isSelected = selectedCategory === entry.category
          const isOtherSelected =
            selectedCategory !== null && selectedCategory !== entry.category

          const pct = new Intl.NumberFormat(intlLocale, {
            maximumFractionDigits: 1,
          }).format(entry.percentage)

          return (
            <button
              key={entry.category}
              type="button"
              className="flex items-center gap-1 transition-opacity"
              style={{ opacity: isOtherSelected ? 0.4 : 1 }}
              onClick={() => handleCellClick(entry.category)}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: color,
                  outline: isSelected
                    ? `2px solid ${color}`
                    : '2px solid transparent',
                  outlineOffset: '1px',
                }}
              />
              <Text className="font-display text-xs tabular-nums">
                {t(entry.category as Parameters<typeof t>[0])}{' '}
                <span className="text-muted-foreground">{pct}%</span>
              </Text>
            </button>
          )
        })}
      </div>
    </div>
  )
}
