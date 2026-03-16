import { List, Section, Skeleton } from '@telegram-apps/telegram-ui'

function PriceRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton visible>
        <div className="size-10 rounded-full" />
      </Skeleton>
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton visible>
          <div className="h-4 w-28 rounded" />
        </Skeleton>
        <Skeleton visible>
          <div className="h-3 w-20 rounded" />
        </Skeleton>
      </div>
      <Skeleton visible>
        <div className="h-4 w-24 rounded" />
      </Skeleton>
    </div>
  )
}

export function PricesSkeleton() {
  return (
    <List>
      {Array.from({ length: 3 }, (_, sectionIdx) => (
        <Section
          key={sectionIdx}
          header={
            <Skeleton visible>
              <div className="h-4 w-20 rounded" />
            </Skeleton>
          }
        >
          {Array.from({ length: 5 }, (_, i) => (
            <PriceRowSkeleton key={i} />
          ))}
        </Section>
      ))}
    </List>
  )
}
