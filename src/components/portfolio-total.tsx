import { LargeTitle, Text } from '@telegram-apps/telegram-ui'

import { formatIRT } from '@/lib/prices'

interface PortfolioTotalProps {
  totalIRT: number
}

export function PortfolioTotal({ totalIRT }: PortfolioTotalProps) {
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <div className="flex items-baseline gap-1.5">
        <LargeTitle weight="2" className="tabular-nums">
          {formatIRT(totalIRT)}
        </LargeTitle>
        <Text weight="3" className="text-tgui-hint">
          تومان
        </Text>
      </div>
    </div>
  )
}
