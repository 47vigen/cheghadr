'use client'

import type { Key } from '@heroui/react'
import { ListBox, Select, Separator } from '@heroui/react'
import { IconPlus } from '@tabler/icons-react'
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
          <Select.Value>
            {({ selectedItem }) => {
              const item = selectedItem as { textValue: string } | null
              return item?.textValue ?? `📊 ${t('consolidated')}`
            }}
          </Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id="" textValue={`📊 ${t('consolidated')}`}>
              <ListBox.ItemIndicator />📊 {t('consolidated')}
            </ListBox.Item>
            {portfolios.map((p) => (
              <ListBox.Item
                key={p.id}
                id={p.id}
                textValue={`${p.emoji ?? '💼'} ${p.name}`}
              >
                <ListBox.ItemIndicator />
                <span className="flex flex-1 items-center justify-between gap-2">
                  <span>
                    {p.emoji ?? '💼'} {p.name}
                  </span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {p.assetCount}
                  </span>
                </span>
              </ListBox.Item>
            ))}
            <Separator />
            <ListBox.Item id="__create__" textValue={t('newPortfolio')}>
              <IconPlus
                size={14}
                aria-hidden
                className="shrink-0 text-muted-foreground"
              />
              {t('newPortfolio')}
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  )
}
