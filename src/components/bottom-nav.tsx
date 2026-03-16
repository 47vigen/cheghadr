'use client'

import type { ComponentType } from 'react'

import { IconCalculator, IconChartLine, IconCoins } from '@tabler/icons-react'
import { Tabbar } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

import { usePathname, useRouter } from '@/i18n/navigation'

type AppRoute = '/' | '/prices' | '/calculator'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations('nav')

  const tabs: Array<{
    id: string
    path: AppRoute
    label: string
    Icon: ComponentType<{ size: number }>
  }> = [
    { id: 'assets', path: '/', label: t('assets'), Icon: IconCoins },
    { id: 'prices', path: '/prices', label: t('prices'), Icon: IconChartLine },
    {
      id: 'calculator',
      path: '/calculator',
      label: t('calculator'),
      Icon: IconCalculator,
    },
  ]

  return (
    <Tabbar>
      {tabs.map(({ id, path, label, Icon }) => (
        <Tabbar.Item
          key={id}
          selected={pathname === path}
          text={label}
          onClick={() => router.push(path)}
        >
          <Icon size={28} />
        </Tabbar.Item>
      ))}
    </Tabbar>
  )
}
