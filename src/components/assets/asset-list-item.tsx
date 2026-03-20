'use client'

import { Button, Text } from '@heroui/react'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'

import { ChangeLabel } from '@/components/prices/change-label'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'

import { formatIRT, getIntlLocale, pickDisplayName } from '@/lib/prices'
import type { AssetListEntry } from '@/types/api'

type AssetListItemProps = AssetListEntry & {
  portfolioPercentage?: number | null
  onEdit: () => void
  onDelete: () => void
}

export function AssetListItem({
  id: _id,
  symbol,
  quantity,
  valueIRT,
  displayNames,
  assetIcon,
  change,
  sellPrice: _sellPrice,
  portfolioPercentage,
  onEdit,
  onDelete,
}: AssetListItemProps) {
  const t = useTranslations('assets')
  const tBreakdown = useTranslations('breakdown')
  const locale = useLocale()
  const intlLocale = getIntlLocale(locale)
  const assetName = pickDisplayName(displayNames, locale, symbol)

  return (
    <Cell
      before={<AssetAvatar alt={assetName} symbol={symbol} src={assetIcon} />}
      subtitle={`${new Intl.NumberFormat(intlLocale).format(Number(quantity))} ${t('units')}`}
      after={
        <div className="flex items-center gap-1.5">
          <div className="flex flex-col items-end gap-0.5">
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
          <div className="flex items-center gap-0.5">
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onEdit}
              aria-label={t('editTitle', { name: assetName })}
            >
              <IconEdit size={14} />
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              size="sm"
              onPress={onDelete}
              aria-label={t('deleteTitle')}
              className="text-destructive"
            >
              <IconTrash size={14} />
            </Button>
          </div>
        </div>
      }
    >
      {assetName}
    </Cell>
  )
}
