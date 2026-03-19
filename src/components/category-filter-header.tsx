'use client'

import { Button, Text } from '@heroui/react'
import { IconX } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import { getCategoryColor } from '@/lib/category-colors'
import { formatIRT } from '@/lib/prices'

interface CategoryFilterHeaderProps {
  category: string
  valueIRT: number
  percentage: number
  onClear: () => void
}

export function CategoryFilterHeader({
  category,
  valueIRT,
  percentage,
  onClear,
}: CategoryFilterHeaderProps) {
  const t = useTranslations('categories')
  const tBreakdown = useTranslations('breakdown')
  const locale = useLocale()
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US'
  const color = getCategoryColor(category)

  const pct = new Intl.NumberFormat(intlLocale, {
    maximumFractionDigits: 1,
  }).format(percentage)

  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <div className="flex min-w-0 flex-col">
          <Text className="truncate font-display font-medium text-sm leading-tight">
            {t(category as Parameters<typeof t>[0])}
          </Text>
          <Text className="text-muted-foreground text-xs tabular-nums">
            {formatIRT(valueIRT, locale)} · {pct}% {tBreakdown('ofPortfolio')}
          </Text>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onPress={onClear}
        className="shrink-0 text-xs"
      >
        {tBreakdown('showAll')}
        <IconX size={12} />
      </Button>
    </div>
  )
}
