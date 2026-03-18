'use client'

import { useMemo } from 'react'

import { useTranslations } from 'next-intl'

import type { PriceItem } from '@/lib/prices'
import {
  filterPriceItems,
  groupByCategory,
  knownCategories,
  sortedGroupEntries,
} from '@/lib/prices'

export function useAssetSearchGroups(items: PriceItem[], search: string) {
  const tCat = useTranslations('categories')

  return useMemo(() => {
    const filteredItems = filterPriceItems(items, search)
    const grouped = groupByCategory(filteredItems)
    const entries = sortedGroupEntries(grouped).map(
      ([category, categoryItems]) => {
        const categoryLabel = knownCategories.has(category)
          ? tCat(category as Parameters<typeof tCat>[0])
          : category
        return { category, categoryLabel, items: categoryItems }
      },
    )

    return entries
  }, [items, search, tCat])
}
