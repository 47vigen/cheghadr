import { Caption, LargeTitle, Text } from '@telegram-apps/telegram-ui'

import { StalenessBadge } from '@/components/staleness-badge'

import { formatIRT } from '@/lib/prices'

interface PortfolioTotalProps {
  totalIRT: number
  stale: boolean
  snapshotAt: Date | null
}

export function PortfolioTotal({
  totalIRT,
  stale,
  snapshotAt,
}: PortfolioTotalProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8">
      <Caption level="1" style={{ color: 'var(--tgui--hint_color)' }}>
        ارزش کل دارایی‌ها
      </Caption>
      <div className="flex items-baseline gap-1.5">
        <LargeTitle weight="2" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatIRT(totalIRT)}
        </LargeTitle>
        <Text weight="3" style={{ color: 'var(--tgui--hint_color)' }}>
          تومان
        </Text>
      </div>
      <StalenessBadge snapshotAt={snapshotAt} stale={stale} />
    </div>
  )
}
