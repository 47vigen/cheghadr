'use client'

import { useState } from 'react'

import { IconEdit, IconTrash } from '@tabler/icons-react'
import {
  Avatar,
  Button,
  Cell,
  Input,
  Modal,
  Section,
  Spinner,
  Subheadline,
  Text,
} from '@telegram-apps/telegram-ui'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ChangeLabel } from '@/components/change-label'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'
import { formatIRT } from '@/lib/prices'
import { api } from '@/trpc/react'

interface AssetListItemProps {
  id: string
  symbol: string
  quantity: { toString(): string }
  valueIRT: number
  assetName: string
  assetIcon: string | null
  change: string | null
  sellPrice: number
}

export function AssetListItem({
  id,
  symbol,
  quantity,
  valueIRT,
  assetName,
  assetIcon,
  change,
}: AssetListItemProps) {
  const t = useTranslations('assets')
  const locale = useLocale()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newQuantity, setNewQuantity] = useState(String(quantity))

  const utils = api.useUtils()
  const { notificationOccurred, impactOccurred } = useTelegramHaptics()

  const updateMutation = api.assets.update.useMutation({
    onSuccess: () => {
      notificationOccurred('success')
      void utils.assets.list.invalidate()
      setEditOpen(false)
      toast.success(t('toastUpdated'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastUpdateError'))
    },
  })

  const deleteMutation = api.assets.delete.useMutation({
    onSuccess: () => {
      impactOccurred('medium')
      void utils.assets.list.invalidate()
      setDeleteOpen(false)
      toast.success(t('toastDeleted'))
    },
    onError: (err) => {
      notificationOccurred('error')
      toast.error(err.message || t('toastDeleteError'))
    },
  })

  const handleUpdate = () => {
    const qty = Number(newQuantity)
    if (!newQuantity || Number.isNaN(qty) || qty <= 0) {
      toast.error(t('toastInvalidQuantity'))
      return
    }
    updateMutation.mutate({ id, quantity: newQuantity })
  }

  const handleDelete = () => {
    deleteMutation.mutate({ id })
  }

  return (
    <>
      <Cell
        before={
          assetIcon ? (
            <Avatar src={assetIcon} size={40} />
          ) : (
            <Avatar size={40} acronym={symbol.slice(0, 2)} />
          )
        }
        subtitle={`${new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(Number(quantity))} ${t('units')}`}
        after={
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <Text weight="2" className="tabular-nums">
                {formatIRT(valueIRT, locale)} {t('tomanAbbr')}
              </Text>
              <ChangeLabel change={change} />
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setNewQuantity(String(quantity))
                  setEditOpen(true)
                }}
                aria-label={t('editTitle', { name: assetName })}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-tgui-text hover:bg-tgui-tertiary active:opacity-80"
              >
                <IconEdit size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                aria-label={t('deleteTitle')}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-tgui-destructive-text hover:bg-tgui-tertiary active:opacity-80"
              >
                <IconTrash size={16} />
              </button>
            </div>
          </div>
        }
      >
        {assetName}
      </Cell>

      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        header={
          <Modal.Header>{t('editTitle', { name: assetName })}</Modal.Header>
        }
      >
        <Input
          type="number"
          inputMode="decimal"
          value={newQuantity}
          header={t('editQuantityHeader')}
          placeholder={t('editQuantityPlaceholder')}
          onChange={(e) => setNewQuantity(e.target.value)}
        />
        <Button
          stretched
          mode="filled"
          onClick={handleUpdate}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? <Spinner size="s" /> : t('save')}
        </Button>
      </Modal>

      <Modal open={deleteOpen} onOpenChange={setDeleteOpen}>
        <Modal.Header>{t('deleteTitle')}</Modal.Header>
        <Section>
          <Subheadline level="2" className="mb-4 text-center">
            {t('deleteConfirm', { name: assetName })}
          </Subheadline>
          <div className="flex gap-2">
            <Button
              mode="bezeled"
              stretched
              onClick={() => setDeleteOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              mode="bezeled"
              stretched
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-tgui-destructive-text"
            >
              {deleteMutation.isPending ? <Spinner size="s" /> : t('delete')}
            </Button>
          </div>
        </Section>
        <Modal.Close />
      </Modal>
    </>
  )
}
