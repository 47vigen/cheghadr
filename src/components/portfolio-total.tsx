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
    <div className="flex flex-col items-center gap-2 px-4 py-6">
      <p className="text-muted-foreground text-sm">ارزش کل دارایی‌ها</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-bold text-4xl tabular-nums">
          {formatIRT(totalIRT)}
        </span>
        <span className="text-base text-muted-foreground">تومان</span>
      </div>
      <StalenessBadge snapshotAt={snapshotAt} stale={stale} />
    </div>
  )
}
