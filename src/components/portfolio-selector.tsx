'use client'

import { useTranslations } from 'next-intl'

interface Portfolio {
  id: string
  name: string
  emoji: string | null
  assetCount: number
}

interface PortfolioSelectorProps {
  portfolios: Portfolio[]
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

  const currentLabel =
    selectedId === null
      ? `📊 ${t('consolidated')}`
      : (() => {
          const p = portfolios.find((x) => x.id === selectedId)
          return p ? `${p.emoji ?? '💼'} ${p.name}` : `📊 ${t('consolidated')}`
        })()

  return (
    <div className="relative mb-3">
      <select
        className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 pe-8 font-medium text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        value={selectedId ?? ''}
        onChange={(e) => {
          const val = e.target.value
          if (val === '__create__') {
            onCreate()
          } else {
            onSelect(val === '' ? null : val)
          }
        }}
        aria-label={currentLabel}
      >
        <option value="">📊 {t('consolidated')}</option>
        {portfolios.map((p) => (
          <option key={p.id} value={p.id}>
            {p.emoji ?? '💼'} {p.name} ({p.assetCount})
          </option>
        ))}
        <option value="__create__">➕ {t('newPortfolio')}</option>
      </select>
      <span
        className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs"
        aria-hidden
      >
        ▾
      </span>
    </div>
  )
}
