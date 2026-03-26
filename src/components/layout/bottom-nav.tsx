'use client'

import type { ComponentType } from 'react'

import { IconCalculator, IconChartLine, IconCoins } from '@tabler/icons-react'
import { useTranslations } from 'next-intl'

import { useTelegramHaptics } from '@/hooks/use-telegram-haptics'

import { usePathname, useRouter } from '@/i18n/navigation'

type AppRoute = '/app' | '/prices' | '/calculator'

const tabs: Array<{
  id: string
  path: AppRoute
  labelKey: string
  Icon: ComponentType<{ size: number }>
}> = [
  { id: 'assets', path: '/app', labelKey: 'assets', Icon: IconCoins },
  { id: 'prices', path: '/prices', labelKey: 'prices', Icon: IconChartLine },
  {
    id: 'calculator',
    path: '/calculator',
    labelKey: 'calculator',
    Icon: IconCalculator,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')
  const { selectionChanged } = useTelegramHaptics()

  if (pathname.startsWith('/assets/add')) return null

  return (
    <nav
      className="fixed start-0 end-0 bottom-0 z-40 flex items-center justify-around border-border border-t bg-surface px-2 py-1 pb-[env(safe-area-inset-bottom)]"
      style={{
        height: 'calc(var(--tabbar-height) + env(safe-area-inset-bottom))',
      }}
    >
      {tabs.map(({ id, path, labelKey, Icon }) => {
        const isSelected = pathname === path
        return (
          <button
            key={id}
            type="button"
            aria-label={t(labelKey)}
            aria-current={isSelected ? 'page' : undefined}
            onClick={() => {
              selectionChanged()
              router.push(path)
            }}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 transition-colors ${
              isSelected
                ? 'text-accent'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={20} aria-hidden />
            <span className="label-compact" aria-hidden>
              {t(labelKey)}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
