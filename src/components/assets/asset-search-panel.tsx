'use client'

import type { ReactNode } from 'react'

import { SearchField } from '@heroui/react'

import {
  type AssetListGroup,
  AssetListSurface,
} from '@/components/assets/asset-list-surface'
import { Section } from '@/components/ui/section'

import { getDir } from '@/lib/i18n-utils'
import type { PriceItem } from '@/lib/prices'

interface AssetSearchPanelProps {
  search: string
  onSearchChange: (value: string) => void
  locale: string
  searchPlaceholder: string
  groups: AssetListGroup[]
  onSelect: (item: PriceItem) => void
  getSubtitle?: (item: PriceItem) => string
  getAfter?: (item: PriceItem) => ReactNode
  emptyHeader: string
  beforeList?: ReactNode
  wrapSearchInSection?: boolean
  /** When true, skip rendering the search field (used when search is hoisted to a parent sticky header). */
  hideSearch?: boolean
}

export function AssetSearchPanel({
  search,
  onSearchChange,
  locale,
  searchPlaceholder,
  groups,
  onSelect,
  getSubtitle,
  getAfter,
  emptyHeader,
  beforeList,
  wrapSearchInSection = false,
  hideSearch = false,
}: AssetSearchPanelProps) {
  const searchField = (
    <SearchField value={search} onChange={onSearchChange} fullWidth>
      <SearchField.Group>
        <SearchField.SearchIcon />
        <SearchField.Input
          placeholder={searchPlaceholder}
          dir={getDir(locale)}
          className="py-3"
        />
        <SearchField.ClearButton />
      </SearchField.Group>
    </SearchField>
  )

  return (
    <div className="section-stack">
      {!hideSearch &&
        (wrapSearchInSection ? <Section>{searchField}</Section> : searchField)}

      {beforeList}

      <AssetListSurface
        groups={groups}
        onSelect={onSelect}
        getSubtitle={getSubtitle}
        getAfter={getAfter}
        emptyHeader={emptyHeader}
      />
    </div>
  )
}
