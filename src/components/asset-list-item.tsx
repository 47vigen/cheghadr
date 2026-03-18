'use client'

import { useState } from 'react'

import {
  Button,
  Input,
  Label,
  Modal,
  Spinner,
  Text,
  TextField,
} from '@heroui/react'
import { IconEdit, IconTrash } from '@tabler/icons-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ChangeLabel } from '@/components/change-label'
import { AssetAvatar } from '@/components/ui/asset-avatar'
import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

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
        before={<AssetAvatar alt={assetName} symbol={symbol} src={assetIcon} />}
        subtitle={`${new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US').format(Number(quantity))} ${t('units')}`}
        after={
          <div className="flex items-center gap-1.5">
            <div className="flex flex-col items-end gap-0.5">
              <Text className="font-display font-semibold text-sm tabular-nums">
                {formatIRT(valueIRT, locale)} {t('tomanAbbr')}
              </Text>
              <ChangeLabel change={change} />
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() => {
                  setNewQuantity(String(quantity))
                  setEditOpen(true)
                }}
                aria-label={t('editTitle', { name: assetName })}
              >
                <IconEdit size={14} />
              </Button>
              <Button
                isIconOnly
                variant="ghost"
                size="sm"
                onPress={() => setDeleteOpen(true)}
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

      <Modal>
        <Modal.Backdrop isOpen={editOpen} onOpenChange={setEditOpen}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>
                  {t('editTitle', { name: assetName })}
                </Modal.Heading>
              </Modal.Header>
              <Modal.Body className="modal-body">
                <TextField
                  value={newQuantity}
                  onChange={setNewQuantity}
                  fullWidth
                  name="quantity"
                >
                  <Label>{t('editQuantityHeader')}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={t('editQuantityPlaceholder')}
                  />
                </TextField>
                <Button
                  variant="primary"
                  fullWidth
                  onPress={handleUpdate}
                  isDisabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    t('save')
                  )}
                </Button>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <Modal>
        <Modal.Backdrop isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[360px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('deleteTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Section>
                  <Text className="mb-4 text-center text-muted-foreground text-sm">
                    {t('deleteConfirm', { name: assetName })}
                  </Text>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      fullWidth
                      onPress={() => setDeleteOpen(false)}
                    >
                      {t('cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      fullWidth
                      onPress={handleDelete}
                      isDisabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Spinner size="sm" color="current" />
                      ) : (
                        t('delete')
                      )}
                    </Button>
                  </div>
                </Section>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
