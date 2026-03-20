'use client'

import { Button } from '@heroui/react'
import { IconPlus } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'

export interface AssetsFabProps {
  selectedPortfolioId: string | null
  defaultPortfolioId: string | undefined
}

export function AssetsFab({
  selectedPortfolioId,
  defaultPortfolioId,
}: AssetsFabProps) {
  const t = useTranslations('assets')
  const router = useRouter()

  return (
    <>
      <div aria-hidden className="app-main-fab-scroll-spacer" />
      <div
        className="fab-shadow fixed start-2 end-2 p-1.5"
        style={{
          bottom: 'calc(var(--bottom-above-tabbar) + var(--bottom-safe))',
        }}
      >
        <Button
          variant="primary"
          fullWidth
          size="sm"
          onPress={() => {
            const pid = selectedPortfolioId ?? defaultPortfolioId
            if (pid) {
              router.push(`/assets/add?portfolioId=${pid}`)
            } else {
              router.push('/assets/add')
            }
          }}
          className="inline-flex items-center justify-center gap-2"
        >
          <IconPlus size={18} className="shrink-0" aria-hidden />
          {t('addAsset')}
        </Button>
      </div>
    </>
  )
}
