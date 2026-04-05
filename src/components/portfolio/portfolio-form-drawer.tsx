'use client'

import { useEffect } from 'react'

import { Button, Drawer, Input, Label, Spinner, TextField, toast } from '@heroui/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocale, useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'

import { getDir } from '@/lib/i18n-utils'
import { api } from '@/trpc/react'
import type { PortfolioListItem } from '@/types/api'

interface PortfolioFormDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'rename'
  portfolio?: PortfolioListItem
}

const portfolioSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  emoji: z.string().max(4).optional(),
})

type PortfolioFormValues = z.infer<typeof portfolioSchema>

export function PortfolioFormDrawer({
  isOpen,
  onOpenChange,
  mode,
  portfolio,
}: PortfolioFormDrawerProps) {
  const t = useTranslations('portfolios')
  const tCommon = useTranslations('common')
  const locale = useLocale()

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PortfolioFormValues>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: { name: '', emoji: '' },
  })

  useEffect(() => {
    if (isOpen) {
      reset({
        name: portfolio?.name ?? '',
        emoji: portfolio?.emoji ?? '',
      })
    }
  }, [isOpen, portfolio, reset])

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

  const isPending =
    createMutation.isPending || renameMutation.isPending || isSubmitting

  const onSubmit = (data: PortfolioFormValues) => {
    if (mode === 'create') {
      createMutation.mutate({
        name: data.name,
        emoji: data.emoji?.trim() || undefined,
      })
    } else if (portfolio) {
      renameMutation.mutate({
        id: portfolio.id,
        name: data.name,
        emoji: data.emoji?.trim() || null,
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
              <TextField fullWidth isInvalid={!!errors.name}>
                <Label>{t('name')}</Label>
                <Input
                  {...register('name')}
                  type="text"
                  placeholder={t('namePlaceholder')}
                  dir={getDir(locale)}
                  className="py-3"
                  maxLength={50}
                />
                {errors.name ? (
                  <p role="alert" className="mt-1 text-destructive text-xs">
                    {errors.name.message}
                  </p>
                ) : null}
              </TextField>
              <TextField fullWidth>
                <Label>{t('emoji')}</Label>
                <Input
                  {...register('emoji')}
                  type="text"
                  placeholder="💼"
                  dir="ltr"
                  className="py-3"
                  maxLength={4}
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
                  onPress={() => void handleSubmit(onSubmit)()}
                  isDisabled={isPending}
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
