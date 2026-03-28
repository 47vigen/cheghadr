'use client'

import type { Key } from '@heroui/react'

import { ListBox, Select, Separator } from '@heroui/react'
import { useTranslations } from 'next-intl'

import type { PortfolioListItem } from '@/types/api'

interface PortfolioSelectorProps {
  portfolios: PortfolioListItem[]
  selectedId: string | null
  onSelect: (portfolioId: string | null) => void
  onCreate: () => void
}

export function PortfolioSelector({
  portfolios,
  selectedId,
  onSelect,
  onCreate,
}: PortfolioSelectorProps) {
  const t = useTranslations('portfolios')

  const handleChange = (key: Key | null) => {
    if (key === '__create__') {
      onCreate()
      return
    }
    onSelect(key === '' || key === null ? null : String(key))
  }

  return (
    <div className="mb-3">
      <Select
        value={selectedId ?? ''}
        onChange={handleChange}
        fullWidth
        aria-label={t('consolidated')}
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue={`📊 ${t('consolidated')}`}>
              📊 {t('consolidated')}
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {portfolios.map((p) => (
              <ListBox.Item
                key={p.id}
                id={p.id}
                textValue={`${p.emoji ?? '💼'} ${p.name}`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span>
                    {p.emoji ?? '💼'} {p.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {p.assetCount}
                  </span>
                </span>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
            <Separator />
            <ListBox.Item id="__create__" textValue={t('newPortfolio')}>
              ➕ {t('newPortfolio')}
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
