'use client'

import { useState } from 'react'

import { useLocale, useTranslations } from 'next-intl'

import { AssetDeleteDialog } from '@/components/assets/asset-delete-dialog'
import { AssetEditDrawer } from '@/components/assets/asset-edit-drawer'
import { AssetListItem } from '@/components/assets/asset-list-item'
import { AssetCategoryFilter } from '@/components/assets/asset-category-filter'
import { AssetEmptyState } from '@/components/assets/asset-empty-state'
import { Section } from '@/components/ui/section'

import { pickDisplayName } from '@/lib/prices'
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
  const locale = useLocale()
  const [editTarget, setEditTarget] = useState<AssetListEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AssetListEntry | null>(null)

  if (assets.length === 0) {
    return (
      <div>
        <AssetEmptyState />
      </div>
    )
  }

  return (
    <div>
      <Section header={t('assetsList')}>
        {selectedCategory && selectedCategoryData && (
          <AssetCategoryFilter
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
            onEdit={() => setEditTarget(asset)}
          />
        ))}
      </Section>

      <AssetEditDrawer
        assetId={editTarget?.id ?? ''}
        assetName={
          editTarget
            ? pickDisplayName(
                editTarget.displayNames,
                locale,
                editTarget.symbol,
              )
            : ''
        }
        symbol={editTarget?.symbol ?? ''}
        quantity={editTarget?.quantity ?? { toString: () => '0' }}
        sellPrice={editTarget?.sellPrice ?? 0}
        isOpen={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null)
        }}
        onDelete={() => {
          if (editTarget) setDeleteTarget(editTarget)
          setEditTarget(null)
        }}
      />
      <AssetDeleteDialog
        assetId={deleteTarget?.id ?? ''}
        assetName={
          deleteTarget
            ? pickDisplayName(
                deleteTarget.displayNames,
                locale,
                deleteTarget.symbol,
              )
            : ''
        }
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
