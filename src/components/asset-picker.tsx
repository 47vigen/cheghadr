'use client'

import { useState } from 'react'

import {
  Avatar,
  Button,
  Caption,
  Cell,
  Input,
  Placeholder,
  Section,
  Spinner,
} from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { useTelegramMainButton } from '@/hooks/use-telegram-main-button'
import {
  filterPriceItems,
  formatIRT,
  getLocalizedItemName,
  groupByCategory,
  knownCategories,
  parsePriceSnapshot,
  sortedGroupEntries,
} from '@/lib/prices'
import type { PriceItem } from '@/modules/API/Swagger/ecotrust/gen/models'
import { api } from '@/trpc/react'
import { isTelegramWebApp } from '@/utils/telegram'

interface AssetPickerProps {
  priceData: unknown
  onSaved: () => void
}

export function AssetPicker({ priceData, onSaved }: AssetPickerProps) {
  const t = useTranslations('assets')
  const tPicker = useTranslations('picker')
  const tCat = useTranslations('categories')
  const locale = useLocale()

  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<PriceItem | null>(null)
  const [quantity, setQuantity] = useState('')

  const utils = api.useUtils()
  const { notificationOccurred } = useTelegramHaptics()
  const inTelegram = isTelegramWebApp()

  const addMutation = api.assets.add.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      toast.success(t('toastAdded'))
      onSaved()
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastAddError'))
    },
  })

  const items = parsePriceSnapshot(priceData)
  const filtered = filterPriceItems(items, search)
  const grouped = groupByCategory(filtered)
  const entries = sortedGroupEntries(grouped)

  const handleSave = () => {
    if (!selected || addMutation.isPending) return
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    addMutation.mutate({ symbol: selected.base_currency.symbol, quantity })
  }

  const qty = Number(quantity)
  const canSave = !!selected && !!quantity && !Number.isNaN(qty) && qty > 0

  useTelegramMainButton({
    text: tPicker('save'),
    onClick: handleSave,
    isVisible: canSave,
    isLoading: addMutation.isPending,
  })

  return (
    <>
      <Section>
        <Input
          placeholder={tPicker('search')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelected(null)
          }}
          type="search"
          dir={locale === 'fa' ? 'rtl' : 'ltr'}
        />
      </Section>

      {selected && (
        <Section
          header={tPicker('selectedHeader', {
            name: getLocalizedItemName(selected, locale),
          })}
        >
          <Input
            type="number"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={tPicker('enterQuantity')}
          />
          {!inTelegram && (
            <Button
              mode="filled"
              stretched
              onClick={handleSave}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <Spinner size="s" /> : tPicker('save')}
            </Button>
          )}
        </Section>
      )}

      {entries.map(([category, categoryItems]) => {
        const catLabel = knownCategories.has(category)
          ? tCat(category as Parameters<typeof tCat>[0])
          : category
        return (
          <Section key={category} header={catLabel}>
            {categoryItems.map((item) => {
              const icon = item.png ?? item.base_currency.png
              const isSelected =
                selected?.base_currency.symbol === item.base_currency.symbol
              const name = getLocalizedItemName(item, locale)
              return (
                <Cell
                  key={item.symbol}
                  before={
                    icon ? (
                      <Avatar src={icon} size={40} />
                    ) : (
                      <Avatar
                        size={40}
                        acronym={item.base_currency.symbol.slice(0, 2)}
                      />
                    )
                  }
                  subtitle={`${formatIRT(Number(item.sell_price), locale)} ${t('tomanAbbr')}`}
                  after={
                    isSelected ? (
                      <Caption level="2" className="text-tgui-accent-text">
                        {tPicker('checkmark')}
                      </Caption>
                    ) : undefined
                  }
                  onClick={() => {
                    setSelected(isSelected ? null : item)
                    setQuantity('')
                  }}
                >
                  {name}
                </Cell>
              )
            })}
          </Section>
        )
      })}

      {entries.length === 0 && (
        <Section>
          <Placeholder header={tPicker('noResults')} />
        </Section>
      )}
    </>
  )
}
