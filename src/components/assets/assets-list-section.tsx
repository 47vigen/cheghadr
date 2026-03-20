'use client'

import { useTranslations } from 'next-intl'

import { AssetListItem } from '@/components/assets/asset-list-item'
import { CategoryFilterHeader } from '@/components/assets/category-filter-header'
import { EmptyState } from '@/components/assets/empty-state'
import { Section } from '@/components/ui/section'

import type { AssetListEntry } from '@/types/api'

export interface AssetsListSectionProps {
  assets: AssetListEntry[]
  filteredAssets: AssetListEntry[]
  totalIRT: number
  selectedCategory: string | null
  selectedCategoryData: {
    category: string
    valueIRT: number
    percentage: number
  } | null
  onClearCategory: () => void
}

export function AssetsListSection({
  assets,
  filteredAssets,
  totalIRT,
  selectedCategory,
  selectedCategoryData,
  onClearCategory,
}: AssetsListSectionProps) {
  const t = useTranslations('assets')

  if (assets.length === 0) {
    return (
      <div>
        <EmptyState />
      </div>
    )
  }

  return (
    <div>
      <Section header={t('assetsList')}>
        {selectedCategory && selectedCategoryData && (
          <CategoryFilterHeader
            category={selectedCategory}
            valueIRT={selectedCategoryData.valueIRT}
            percentage={selectedCategoryData.percentage}
            onClear={onClearCategory}
          />
        )}
        {filteredAssets.map((asset) => (
          <AssetListItem
            key={asset.id}
            {...asset}
            portfolioPercentage={
              selectedCategory && totalIRT > 0
                ? (asset.valueIRT / totalIRT) * 100
                : undefined
            }
          />
        ))}
      </Section>
    </div>
  )
}
