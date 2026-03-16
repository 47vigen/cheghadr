'use client'

import { useRouter } from 'next/navigation'

import { IconWallet } from '@tabler/icons-react'
import { Button, Placeholder } from '@telegram-apps/telegram-ui'

export function EmptyState() {
  const router = useRouter()

  return (
    <Placeholder
      header="هنوز دارایی اضافه نکرده‌اید"
      description="دارایی‌های خود را اضافه کنید تا ارزش کل سبد خود را ببینید"
      action={
        <Button mode="filled" onClick={() => router.push('/assets/add')}>
          افزودن دارایی
        </Button>
      }
    >
      <IconWallet size={64} className="text-tgui-hint" />
    </Placeholder>
  )
}
