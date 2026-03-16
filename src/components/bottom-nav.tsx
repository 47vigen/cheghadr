'use client'

import { Tabbar } from '@telegram-apps/telegram-ui'
import {
  IconCalculator,
  IconChartLine,
  IconCoins,
} from '@tabler/icons-react'
import { usePathname, useRouter } from 'next/navigation'
import type { ComponentType } from 'react'

type AppRoute = '/' | '/prices' | '/calculator'

const tabs: Array<{
  id: string
  path: AppRoute
  label: string
  Icon: ComponentType<{ size: number }>
}> = [
  { id: 'assets', path: '/', label: 'دارایی‌های من', Icon: IconCoins },
  { id: 'prices', path: '/prices', label: 'قیمت‌ها', Icon: IconChartLine },
  {
    id: 'calculator',
    path: '/calculator',
    label: 'ماشین حساب',
    Icon: IconCalculator,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

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
