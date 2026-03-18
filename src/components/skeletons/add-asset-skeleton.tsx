import { List, Section, Skeleton } from '@telegram-apps/telegram-ui'

export function AddAssetSkeleton() {
  return (
    <List>
      <Section>
        <div className="px-4 py-3">
          <Skeleton visible>
            <div className="h-10 w-full rounded" />
          </Skeleton>
        </div>
      </Section>

      <Section header=" ">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton visible>
              <div className="size-10 rounded-full" />
            </Skeleton>
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton visible>
                <div className="h-4 w-24 rounded" />
              </Skeleton>
              <Skeleton visible>
                <div className="h-3 w-16 rounded" />
              </Skeleton>
            </div>
          </div>
        ))}
      </Section>
    </List>
  )
}
