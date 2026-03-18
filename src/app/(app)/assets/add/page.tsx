'use client'

import { IconArrowLeft } from '@tabler/icons-react'
import {
  Cell,
  IconButton,
  List,
  Section,
  Subheadline,
} from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { AssetPicker } from '@/components/asset-picker'
import { AddAssetSkeleton } from '@/components/skeletons/add-asset-skeleton'

import { useTelegramBackButton } from '@/hooks/use-telegram-back-button'
import { useRouter } from '@/i18n/navigation'
import { api } from '@/trpc/react'
import { isTelegramWebApp } from '@/utils/telegram'

export default function AddAssetPage() {
  const router = useRouter()
  const t = useTranslations('addAsset')
  useTelegramBackButton(true)
  const inTelegram = isTelegramWebApp()

  const { data, isLoading } = api.prices.latest.useQuery()

  if (isLoading) {
    return <AddAssetSkeleton />
  }

  return (
    <List>
      {!inTelegram && (
        <Section>
          <Cell
            before={
              <IconButton
                size="m"
                mode="plain"
                aria-label={t('back')}
                onClick={() => router.push('/')}
              >
                <IconArrowLeft size={24} />
              </IconButton>
            }
          >
            {t('title')}
          </Cell>
        </Section>
      )}
      <Section header={inTelegram ? t('title') : undefined}>
        <Subheadline level="2" weight="3" className="text-tgui-hint">
          {t('subtitle')}
        </Subheadline>
      </Section>
      <AssetPicker priceData={data?.data} onSaved={() => router.push('/')} />
    </List>
  )
}
