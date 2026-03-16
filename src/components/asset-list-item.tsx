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
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newQuantity, setNewQuantity] = useState(String(quantity))

  const utils = api.useUtils()

  const updateMutation = api.assets.update.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate()
      setEditOpen(false)
      toast.success('دارایی به‌روز شد')
    },
    onError: (err) => toast.error(err.message || 'خطا در به‌روزرسانی'),
  })

  const deleteMutation = api.assets.delete.useMutation({
    onSuccess: () => {
      void utils.assets.list.invalidate()
      setDeleteOpen(false)
      toast.success('دارایی حذف شد')
    },
    onError: (err) => toast.error(err.message || 'خطا در حذف'),
  })

  const handleUpdate = () => {
    const qty = Number(newQuantity)
    if (!newQuantity || Number.isNaN(qty) || qty <= 0) {
      toast.error('مقدار باید عددی مثبت باشد')
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
        subtitle={`${new Intl.NumberFormat('fa-IR').format(Number(quantity))} واحد`}
        after={
          <div className="flex items-center gap-2">
            <div className="flex flex-col items-end gap-0.5">
              <Text weight="2" className="tabular-nums">
                {formatIRT(valueIRT)} ت
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
        header={<Modal.Header>ویرایش مقدار — {assetName}</Modal.Header>}
      >
        <Modal.Overlay />
        <Section>
          <Input
            type="number"
            inputMode="decimal"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="مقدار جدید"
            header="مقدار"
          />
          <Button
            mode="filled"
            stretched
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? <Spinner size="s" /> : 'ذخیره'}
          </Button>
        </Section>
        <Modal.Close />
      </Modal>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        header={<Modal.Header>حذف دارایی</Modal.Header>}
      >
        <Modal.Overlay />
        <Section>
          <Subheadline level="2" className="mb-4 text-center">
            آیا مطمئن هستید که می‌خواهید <strong>{assetName}</strong> را حذف
            کنید؟
          </Subheadline>
          <div className="flex gap-2">
            <Button
              mode="bezeled"
              stretched
              onClick={() => setDeleteOpen(false)}
            >
              انصراف
            </Button>
            <Button
              mode="bezeled"
              stretched
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-tgui-destructive-text"
            >
              {deleteMutation.isPending ? <Spinner size="s" /> : 'حذف'}
            </Button>
          </div>
        </Section>
        <Modal.Close />
      </Modal>
    </>
  )
}
