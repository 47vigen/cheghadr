'use client'

import { Button } from '@heroui/react'
import { IconDownload, IconPencil, IconTrash } from '@tabler/icons-react'
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

export interface AssetsHeroSectionProps {
  portfolios: PortfolioListItem[] | undefined
  hasMultiplePortfolios: boolean
  selectedPortfolioId: string | null
  onPortfolioSelect: (id: string | null) => void
  onCreatePortfolio: () => void
  onRenamePortfolio: () => void
  onRequestDeletePortfolio: () => void
  totalIRT: number
  usdSellPrice: number | null
  eurSellPrice: number | null
  stale: boolean
  snapshotAt: Date | string | null
  onRefreshStale: () => void
  onExport: () => void
  exportFetching: boolean
  deltaWindow: DeltaWindow
  onDeltaWindowChange: (window: DeltaWindow) => void
  /** Matches trend chart / portfolio delta / biggest mover. */
  chartTimeZone: string
}

export function AssetsHeroSection({
  portfolios,
  hasMultiplePortfolios,
  selectedPortfolioId,
  onPortfolioSelect,
  onCreatePortfolio,
  onRenamePortfolio,
  onRequestDeletePortfolio,
  totalIRT,
  usdSellPrice,
  eurSellPrice,
  stale,
  snapshotAt,
  onRefreshStale,
  onExport,
  exportFetching,
  deltaWindow,
  onDeltaWindowChange,
  chartTimeZone,
}: AssetsHeroSectionProps) {
  const tNav = useTranslations('nav')
  const tExport = useTranslations('export')
  const tPortfolios = useTranslations('portfolios')

  return (
    <div>
      <Section
        header={tNav('assets')}
        variant="hero"
        trailing={
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
        }
      >
        {hasMultiplePortfolios && portfolios && (
          <>
            <PortfolioSelector
              portfolios={portfolios}
              selectedId={selectedPortfolioId}
              onSelect={onPortfolioSelect}
              onCreate={onCreatePortfolio}
            />
            {selectedPortfolioId && (
              <div className="mb-2 flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-xs"
                  onPress={onRenamePortfolio}
                  aria-label={tPortfolios('renameTitle')}
                >
                  <IconPencil size={12} aria-hidden />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 gap-1 px-2 text-destructive text-xs"
                  onPress={onRequestDeletePortfolio}
                  aria-label={tPortfolios('deleteTitle')}
                >
                  <IconTrash size={12} aria-hidden />
                </Button>
              </div>
            )}
          </>
        )}
        <PortfolioTotal
          totalIRT={totalIRT}
          usdSellPrice={usdSellPrice}
          eurSellPrice={eurSellPrice}
        />
        <PortfolioDelta
          portfolioId={selectedPortfolioId ?? undefined}
          timezone={chartTimeZone}
          window={deltaWindow}
          onWindowChange={onDeltaWindowChange}
        />
        {stale && (
          <div className="mt-2 border-border border-t pt-2">
            <StalenessBanner
              snapshotAt={snapshotAt}
              namespace="assets"
              onRefresh={onRefreshStale}
            />
          </div>
        )}
      </Section>
    </div>
  )
}
