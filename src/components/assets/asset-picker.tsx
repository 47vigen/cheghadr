'use client'

import { useState } from 'react'

import { Button, Input, Label, Modal, Spinner, TextField } from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { AssetSearchPanel } from '@/components/assets/asset-search-panel'

import { useAssetSearchGroups } from '@/hooks/use-asset-search-groups'
import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import type { PriceItem } from '@/lib/prices'
import {
  formatIRT,
  getBaseSymbol,
  getLocalizedItemName,
  parsePriceSnapshot,
} from '@/lib/prices'
import { api } from '@/trpc/react'

interface AssetPickerProps {
  priceData: unknown
  portfolioId: string
  onSaved: () => void
}

export function AssetPicker({
  priceData,
  portfolioId,
  onSaved,
}: AssetPickerProps) {
  const t = useTranslations('assets')
  const tPicker = useTranslations('picker')
  const locale = useLocale()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItem, setModalItem] = useState<PriceItem | null>(null)
  const [quantity, setQuantity] = useState('')

  const utils = api.useUtils()
  const { notificationOccurred } = useTelegramHaptics()

  const addMutation = api.assets.add.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      toast.success(t('toastAdded'))
      closeModal()
      onSaved()
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastAddError'))
    },
  })

  const items = parsePriceSnapshot(priceData)
  const groups = useAssetSearchGroups(items, search)

  const closeModal = () => {
    setModalOpen(false)
    setModalItem(null)
    setQuantity('')
  }

  const openModal = (item: PriceItem) => {
    setModalItem(item)
    setQuantity('')
    setModalOpen(true)
  }

  const handleSave = () => {
    if (!modalItem || addMutation.isPending) return
    const qty = Number(quantity)
    if (!quantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    const sym = getBaseSymbol(modalItem)
    if (!sym) {
      toast.error(t('toastAddError'))
      return
    }
    addMutation.mutate({ symbol: sym, quantity, portfolioId })
  }

  return (
    <>
      <AssetSearchPanel
        search={search}
        onSearchChange={(v) => setSearch(v)}
        locale={locale}
        searchPlaceholder={tPicker('search')}
        groups={groups}
        onSelect={openModal}
        getSubtitle={(item) =>
          `${formatIRT(Number(item.sell_price), locale)} ${t('tomanAbbr')}`
        }
        emptyHeader={tPicker('noResults')}
        wrapSearchInSection
      />

      <Modal>
        <Modal.Backdrop
          isOpen={modalOpen}
          onOpenChange={(v: boolean) => {
            if (!v) closeModal()
            else setModalOpen(true)
          }}
        >
          <Modal.Container placement="auto" size="md">
            <Modal.Dialog
              className="sm:max-w-[360px]"
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            >
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {modalItem
                    ? `${getLocalizedItemName(modalItem, locale)} — ${tPicker('enterQuantity')}`
                    : tPicker('enterQuantity')}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="modal-body">
                <TextField value={quantity} onChange={setQuantity} fullWidth>
                  <Label>{tPicker('enterQuantity')}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={tPicker('enterQuantity')}
                    dir={locale === 'fa' ? 'rtl' : 'ltr'}
                  />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleSave}
                  isDisabled={addMutation.isPending}
                >
                  {addMutation.isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    tPicker('save')
                  )}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
