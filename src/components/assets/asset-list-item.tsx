'use client'

import { Text } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { ChangeLabel } from '@/components/prices/change-label'
import { AssetAvatar } from '@/components/ui/asset-avatar'

import { formatIRT, getIntlLocale, pickDisplayName } from '@/lib/prices'
import type { AssetListEntry } from '@/types/api'

type AssetListItemProps = AssetListEntry & {
  portfolioPercentage?: number | null
  onEdit: () => void
}

export function AssetListItem({
  symbol,
  quantity,
  valueIRT,
  displayNames,
  assetIcon,
  change,
  portfolioPercentage,
  onEdit,
}: AssetListItemProps) {
  const t = useTranslations('assets')
  const tBreakdown = useTranslations('breakdown')
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)
  const assetName = pickDisplayName(displayNames, locale, symbol)
  const formattedQuantity = new Intl.NumberFormat(intlLocale).format(
    Number(quantity),
  )

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 text-start transition-opacity active:opacity-60"
      style={{
        minHeight: 'var(--cell-min-h)',
        paddingInline: 'var(--cell-px)',
        paddingBlock: 'var(--cell-py)',
      }}
      onClick={onEdit}
      aria-label={t('editTitle', { name: assetName })}
    >
      <div className="flex shrink-0 items-center self-center">
        <AssetAvatar alt={assetName} symbol={symbol} src={assetIcon} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="truncate font-medium leading-snug">{assetName}</div>
        <div className="truncate text-muted-foreground text-sm leading-snug">
          {formattedQuantity} {t('units')}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <Text className="font-display font-semibold text-sm tabular-nums">
          {formatIRT(valueIRT, locale)} {t('tomanAbbr')}
        </Text>
        <ChangeLabel change={change} />
        {portfolioPercentage != null && (
          <Text className="text-muted-foreground text-xs tabular-nums">
            {new Intl.NumberFormat(intlLocale, {
              maximumFractionDigits: 1,
            }).format(portfolioPercentage)}
            % {tBreakdown('ofPortfolio')}
          </Text>
        )}
      </div>
    </button>
  )
}
