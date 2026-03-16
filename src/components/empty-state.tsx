'use client'

import { useRouter } from 'next/navigation'

import { IconWallet } from '@tabler/icons-react'
import { Placeholder } from '@telegram-apps/telegram-ui'

import { Button } from '@/components/ui/button'

export function EmptyState() {
  const router = useRouter()

  return (
    <Placeholder
      header="هنوز دارایی اضافه نکرده‌اید"
      description="دارایی‌های خود را اضافه کنید تا ارزش کل سبد خود را ببینید"
      action={
        <Button onClick={() => router.push('/assets/add')}>
          افزودن دارایی
        </Button>
      }
    >
      <IconWallet size={64} className="text-muted-foreground" />
    </Placeholder>
  )
}
