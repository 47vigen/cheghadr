'use client'

import { useEffect, useState } from 'react'

import {
  Button,
  Input,
  Label,
  Modal,
  Spinner,
  TextField,
  toast,
} from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { api } from '@/trpc/react'
import type { PortfolioListItem } from '@/types/api'

interface PortfolioFormModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  portfolio?: PortfolioListItem
}

export function PortfolioFormModal({
  isOpen,
  onOpenChange,
  mode,
  portfolio,
}: PortfolioFormModalProps) {
  const t = useTranslations('portfolios')
  const locale = useLocale()

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(portfolio?.name ?? '')
      setEmoji(portfolio?.emoji ?? '')
    }
  }, [isOpen, portfolio])

  const utils = api.useUtils()

  const createMutation = api.portfolio.create.useMutation({
    onSuccess: () => {
      toast.success(t('toastCreated'))
      void utils.portfolio.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.danger(err.message || t('toastCreateError'))
    },
  })

  const renameMutation = api.portfolio.rename.useMutation({
    onSuccess: () => {
      toast.success(t('toastRenamed'))
      void utils.portfolio.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.danger(err.message || t('toastRenameError'))
    },
  })

  const isPending = createMutation.isPending || renameMutation.isPending

  const handleSave = () => {
    if (!name.trim() || isPending) return

    if (mode === 'create') {
      createMutation.mutate({
        name: name.trim(),
        emoji: emoji.trim() || undefined,
      })
    } else if (portfolio) {
      renameMutation.mutate({
        id: portfolio.id,
        name: name.trim(),
        emoji: emoji.trim() || null,
      })
    }
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container placement="auto" size="md">
          <Modal.Dialog
            className="sm:max-w-[360px]"
            dir={locale === 'fa' ? 'rtl' : 'ltr'}
          >
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {mode === 'create' ? t('createTitle') : t('renameTitle')}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3 p-4">
              <TextField
                value={name}
                onChange={setName}
                fullWidth
                maxLength={50}
              >
                <Label>{t('name')}</Label>
                <Input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  dir={locale === 'fa' ? 'rtl' : 'ltr'}
                  className="py-3"
                />
              </TextField>
              <TextField
                value={emoji}
                onChange={setEmoji}
                fullWidth
                maxLength={4}
              >
                <Label>{t('emoji')}</Label>
                <Input
                  type="text"
                  placeholder="💼"
                  dir="ltr"
                  className="py-3"
                />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                size="lg"
                onPress={() => onOpenChange(false)}
                isDisabled={isPending}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onPress={handleSave}
                isDisabled={!name.trim() || isPending}
              >
                {isPending ? <Spinner size="sm" color="current" /> : t('save')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
