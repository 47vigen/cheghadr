'use client'

import { Button } from '@heroui/react'
import { IconDownload, IconPencil, IconSettings2, IconTrash } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import {
  type DeltaWindow,
  PortfolioDelta,
} from '@/components/portfolio/portfolio-delta'
import { PortfolioSelector } from '@/components/portfolio/portfolio-selector'
import { PortfolioTotal } from '@/components/portfolio/portfolio-total'
import { StalenessBanner } from '@/components/prices/staleness-banner'
import { Section } from '@/components/ui/section'

import type { PortfolioListItem } from '@/types/api'

export interface AssetsHeroSectionPortfolioProps {
  portfolios: PortfolioListItem[] | undefined
  selectedId: string | null
  onSelect: (id: string | null) => void
  onCreate: () => void
  onRename: () => void
  onDelete: () => void
}

export interface AssetsHeroSectionPricesProps {
  totalIRT: number
  usdSellPrice: number | null
  eurSellPrice: number | null
  stale: boolean
  snapshotAt: Date | string | null
  onRefresh: () => void
}

export interface AssetsHeroSectionDeltaProps {
  window: DeltaWindow
  onChange: (window: DeltaWindow) => void
  timezone: string
}

export interface AssetsHeroSectionProps {
  portfolio: AssetsHeroSectionPortfolioProps
  prices: AssetsHeroSectionPricesProps
  delta: AssetsHeroSectionDeltaProps
  onSettings: () => void
  onExport: () => void
  exportFetching: boolean
}

export function AssetsHeroSection({
  portfolio,
  prices,
  delta,
  onSettings,
  onExport,
  exportFetching,
}: AssetsHeroSectionProps) {
  const tNav = useTranslations('nav')
  const tExport = useTranslations('export')
  const tPortfolios = useTranslations('portfolios')
  const tSettings = useTranslations('settings')

  return (
    <div>
      <Section
        header={tNav('assets')}
        variant="hero"
        trailing={
          <div className="flex items-center gap-1">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onSettings}
              aria-label={tSettings('title')}
            >
              <IconSettings2 size={18} />
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={() => void onExport()}
              isDisabled={exportFetching}
              aria-label={tExport('button')}
            >
              <IconDownload size={18} />
            </Button>
          </div>
        }
      >
        {portfolio.portfolios && (
          <>
            <PortfolioSelector
              portfolios={portfolio.portfolios}
              selectedId={portfolio.selectedId}
              onSelect={portfolio.onSelect}
              onCreate={portfolio.onCreate}
            />
            {portfolio.selectedId && (
              <div className="mb-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-xs"
                  onPress={portfolio.onRename}
                  aria-label={tPortfolios('renameTitle')}
                >
                  <IconPencil size={12} aria-hidden />
                  {tPortfolios('renameTitle')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-destructive text-xs"
                  onPress={portfolio.onDelete}
                  aria-label={tPortfolios('deleteTitle')}
                >
                  <IconTrash size={12} aria-hidden />
                </Button>
              </div>
            )}
          </>
        )}
        <PortfolioTotal
          totalIRT={prices.totalIRT}
          usdSellPrice={prices.usdSellPrice}
          eurSellPrice={prices.eurSellPrice}
        />
        <PortfolioDelta
          portfolioId={portfolio.selectedId ?? undefined}
          timezone={delta.timezone}
          window={delta.window}
          onWindowChange={delta.onChange}
        />
        {prices.stale && (
          <div className="mt-2 border-border border-t pt-2">
            <StalenessBanner
              snapshotAt={prices.snapshotAt}
              onRefresh={prices.onRefresh}
            />
          </div>
        )}
      </Section>
    </div>
  )
}
