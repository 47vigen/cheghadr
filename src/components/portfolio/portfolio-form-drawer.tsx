'use client'

import { useEffect, useState } from 'react'

import {
  Button,
  Drawer,
  Input,
  Label,
  Spinner,
  TextField,
  toast,
} from '@heroui/react'
import { useLocale, useTranslations } from 'next-intl'

import { getDir } from '@/lib/i18n-utils'
import { api } from '@/trpc/react'
import type { PortfolioListItem } from '@/types/api'

interface PortfolioFormDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  portfolio?: PortfolioListItem
}

export function PortfolioFormDrawer({
  isOpen,
  onOpenChange,
  mode,
  portfolio,
}: PortfolioFormDrawerProps) {
  const t = useTranslations('portfolios')
  const tCommon = useTranslations('common')
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
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(v) => {
          if (!v) onOpenChange(false)
        }}
      >
        <Drawer.Content placement="bottom">
          <Drawer.Dialog
            dir={getDir(locale)}
            className="max-h-[min(92dvh,var(--visual-viewport-height,100dvh)*0.92)] border-border/60 border-t bg-background px-0 pt-3 pb-0 shadow-[0_-8px_32px_oklch(0_0_0/0.12)] sm:max-h-[min(90dvh,var(--visual-viewport-height,100dvh)*0.9)] dark:shadow-[0_-12px_40px_oklch(0_0_0/0.35)]"
          >
            <Drawer.Handle className="mx-auto mb-0.5" />
            <Drawer.Header className="border-border/40 border-b px-4 pt-0 pb-3">
              <Drawer.Heading className="font-semibold text-base leading-snug">
                {mode === 'create' ? t('createTitle') : t('renameTitle')}
              </Drawer.Heading>
            </Drawer.Header>

            <Drawer.Body className="flex flex-col gap-4 px-4 py-4">
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
                  dir={getDir(locale)}
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
            </Drawer.Body>

            <Drawer.Footer className="border-border/60 border-t bg-background/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="lg"
                  className="flex-1 rounded-xl"
                  onPress={() => onOpenChange(false)}
                  isDisabled={isPending}
                >
                  {tCommon('cancel')}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 rounded-xl font-semibold"
                  onPress={handleSave}
                  isDisabled={!name.trim() || isPending}
                >
                  {isPending ? (
                    <Spinner size="sm" color="current" />
                  ) : (
                    t('save')
                  )}
                </Button>
              </div>
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
