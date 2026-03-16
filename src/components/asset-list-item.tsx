'use client'

import { useState } from 'react'

import { IconEdit, IconTrash } from '@tabler/icons-react'
import {
  Avatar,
  Button,
  Cell,
  IconButton,
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

  const updateMutation = api.assets.update.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate()
      setEditOpen(false)
      toast.success(t('toastUpdated'))
    },
    onError: (err) => toast.error(err.message || t('toastUpdateError')),
  })

  const deleteMutation = api.assets.delete.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate()
      setDeleteOpen(false)
      toast.success(t('toastDeleted'))
    },
    onError: (err) => toast.error(err.message || t('toastDeleteError')),
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
              <IconButton
                size="s"
                mode="plain"
                onClick={() => {
                  setNewQuantity(String(quantity))
                  setEditOpen(true)
                }}
              >
                <IconEdit size={16} />
              </IconButton>
              <IconButton
                size="s"
                mode="plain"
                onClick={() => setDeleteOpen(true)}
              >
                <IconTrash size={16} className="text-tgui-destructive-text" />
              </IconButton>
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
        <Modal.Overlay />
        <Section>
          <Input
            type="number"
            inputMode="decimal"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder={t('editQuantityPlaceholder')}
            header={t('editQuantityHeader')}
          />
          <Button
            mode="filled"
            stretched
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Spinner size="s" /> : t('save')}
          </Button>
        </Section>
        <Modal.Close />
      </Modal>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        header={<Modal.Header>{t('deleteTitle')}</Modal.Header>}
      >
        <Modal.Overlay />
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
