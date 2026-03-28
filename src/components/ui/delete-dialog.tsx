'use client'

import type { ReactNode } from 'react'

import { AlertDialog, Button, Spinner } from '@heroui/react'
import { useLocale } from 'next-intl'

import { getDir } from '@/lib/i18n-utils'

export interface DeleteDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  onConfirm: () => void
  isPending: boolean
  cancelLabel: string
  confirmLabel: string
}

export function DeleteDialog({
  isOpen,
  onOpenChange,
  title,
  body,
  onConfirm,
  isPending,
  cancelLabel,
  confirmLabel,
}: DeleteDialogProps) {
  const locale = useLocale()

  return (
    <AlertDialog.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialog.Container placement="auto" size="sm">
        <AlertDialog.Dialog className="sm:max-w-[360px]" dir={getDir(locale)}>
          <AlertDialog.Header>
            <AlertDialog.Icon status="danger" />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{body}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button
              slot="close"
              variant="tertiary"
              size="lg"
              isDisabled={isPending}
            >
              {cancelLabel}
            </Button>
            <Button
              variant="danger"
              size="lg"
              onPress={onConfirm}
              isDisabled={isPending}
            >
              {isPending ? <Spinner size="sm" color="current" /> : confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  )
}
