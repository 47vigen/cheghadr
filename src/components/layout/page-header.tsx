'use client'

import { Button } from '@heroui/react'
import { IconArrowLeft } from '@tabler/icons-react'

import { Cell } from '@/components/ui/cell'
import { Section } from '@/components/ui/section'

import { useRouter } from '@/i18n/navigation'
import { isTelegramWebApp } from '@/utils/telegram'

interface PageHeaderProps {
  title: string
  /** Overrides default router.back() behaviour. */
  onBack?: () => void
  /** Accessible label for the back button. Defaults to title. */
  backLabel?: string
}

export function PageHeader({ title, onBack, backLabel }: PageHeaderProps) {
  const router = useRouter()
  const inTelegram = isTelegramWebApp()
  const handleBack = onBack ?? (() => router.back())

  if (inTelegram) {
    return (
      <div className="px-3 pt-3 pb-1">
        <h2 className="section-header mb-0.5">{title}</h2>
      </div>
    )
  }

  return (
    <div>
      <Section>
        <Cell
          before={
            <Button
              isIconOnly
              variant="ghost"
              size="md"
              aria-label={backLabel ?? title}
              onPress={handleBack}
            >
              <IconArrowLeft size={24} />
            </Button>
          }
        >
          {title}
        </Cell>
      </Section>
    </div>
  )
}
