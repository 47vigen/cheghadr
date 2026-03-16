import { List, Section, Skeleton } from '@telegram-apps/telegram-ui'
import { useTranslations } from 'next-intl'

export function CalculatorSkeleton() {
  const t = useTranslations('calculator')
  return (
    <List>
      <Section header={t('title')}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="px-4 py-3">
            <Skeleton visible>
              <div className="h-12 w-full rounded" />
            </Skeleton>
          </div>
        ))}
      </Section>

      <Section header={t('resultTitle')}>
        <div className="px-4 py-3">
          <Skeleton visible>
            <div className="h-8 w-40 rounded" />
          </Skeleton>
        </div>
      </Section>
    </List>
  )
}
