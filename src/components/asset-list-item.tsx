'use client'

import { useState } from 'react'

import { IconEdit, IconTrash } from '@tabler/icons-react'
import {
  Avatar,
  Cell,
  IconButton,
  Modal,
  Spinner,
} from '@telegram-apps/telegram-ui'
import { toast } from 'sonner'

import { ChangeLabel } from '@/components/change-label'
import { Button } from '@/components/ui/button'

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
          <div className="flex items-center gap-1">
            <div className="flex flex-col items-end gap-0.5 text-sm">
              <span className="font-medium tabular-nums">
                {formatIRT(valueIRT)} ت
              </span>
              <ChangeLabel change={change} />
            </div>
            <div className="flex flex-col gap-1">
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
                <IconTrash size={16} className="text-destructive" />
              </IconButton>
            </div>
          </div>
        }
      >
        {assetName}
      </Cell>

      {/* Edit modal */}
      <Modal
        open={editOpen}
        onOpenChange={setEditOpen}
        header={<Modal.Header>ویرایش مقدار — {assetName}</Modal.Header>}
      >
        <div className="flex flex-col gap-4 p-4">
          <input
            type="number"
            inputMode="decimal"
            value={newQuantity}
            onChange={(e) => setNewQuantity(e.target.value)}
            placeholder="مقدار جدید"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-right text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending ? <Spinner size="s" /> : 'ذخیره'}
          </Button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        header={<Modal.Header>حذف دارایی</Modal.Header>}
      >
        <div className="flex flex-col gap-4 p-4">
          <p className="text-center text-sm">
            آیا مطمئن هستید که می‌خواهید <strong>{assetName}</strong> را حذف
            کنید؟
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="flex-1"
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="flex-1"
            >
              {deleteMutation.isPending ? <Spinner size="s" /> : 'حذف'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
