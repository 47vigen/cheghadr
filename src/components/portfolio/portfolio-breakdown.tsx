'use client'

import { Text } from '@heroui/react'
import { clsx } from 'clsx'
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

function formatPercentage(value: number, intlLocale: string): string {
  if (value < 0.1) {
    return new Intl.NumberFormat(intlLocale, {
      maximumSignificantDigits: 2,
    }).format(value)
  }
  return new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
  }).format(value)
}

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

  const pct = formatPercentage(entry.payload.percentage, intlLocale)

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
  totalIRT: _totalIRT,
  selectedCategory,
  onCategorySelect,
}: PortfolioBreakdownProps) {
  const t = useTranslations('categories')
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)
  const { selectionChanged } = useTelegramHaptics()

  const handleCellClick = (category: string) => {
    selectionChanged()
    onCategorySelect(selectedCategory === category ? null : category)
  }

  return (
    <div className="py-2">
      <div
        className={clsx(
          'flex items-center gap-3 px-2',
          locale === 'fa' && 'flex-row-reverse',
        )}
      >
        <div dir="ltr" className="chart-mount w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={data}
                dataKey="valueIRT"
                nameKey="category"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={85}
                paddingAngle={data.length > 1 ? 2 : 0}
                strokeWidth={0}
                minAngle={3}
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
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {data.map((entry) => {
            const color = getCategoryColor(entry.category)
            const isSelected = selectedCategory === entry.category
            const isOtherSelected =
              selectedCategory !== null && selectedCategory !== entry.category

            const pct = formatPercentage(entry.percentage, intlLocale)

            return (
              <button
                key={entry.category}
                type="button"
                className="flex w-full items-center gap-2 text-start transition-opacity"
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
    </div>
  )
}
