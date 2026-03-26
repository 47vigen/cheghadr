'use client'

import type { ReactNode } from 'react'

import { InputGroup, TextField } from '@heroui/react'
import { IconSearch } from '@tabler/icons-react'

import {
  type AssetListGroup,
  AssetListSurface,
} from '@/components/assets/asset-list-surface'
import { Section } from '@/components/ui/section'

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
}: AssetSearchPanelProps) {
  const searchField = (
    <TextField value={search} onChange={onSearchChange} fullWidth>
      <InputGroup>
        <InputGroup.Prefix>
          <IconSearch size={16} className="text-muted-foreground" />
        </InputGroup.Prefix>
        <InputGroup.Input
          placeholder={searchPlaceholder}
          type="search"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
          className="py-3 [appearance:textfield] [color-scheme:inherit] [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
        />
      </InputGroup>
    </TextField>
  )

  return (
    <div className="section-stack">
      {wrapSearchInSection ? <Section>{searchField}</Section> : searchField}

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
