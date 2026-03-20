import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL not set')
  const adapter = new PrismaNeon({ connectionString })
  return new PrismaClient({ adapter })
}

const db = createDb()

async function main() {
  // Find all users who have assets with no portfolioId (un-migrated)
  const usersWithUnmigrated = await db.user.findMany({
    where: { assets: { some: {} } },
    select: { id: true },
  })

  console.log(
    `Found ${usersWithUnmigrated.length} users with un-migrated assets`,
  )

  for (const user of usersWithUnmigrated) {
    // Check if a default portfolio already exists for this user
    const existing = await db.portfolio.findFirst({
      where: { userId: user.id },
    })

    let portfolioId: string

    if (existing) {
      portfolioId = existing.id
      console.log(`User ${user.id}: using existing portfolio ${portfolioId}`)
    } else {
      const portfolio = await db.portfolio.create({
        data: {
          userId: user.id,
          name: 'سبد من',
          emoji: '💼',
        },
      })
      portfolioId = portfolio.id
      console.log(`User ${user.id}: created portfolio ${portfolioId}`)
    }

    // Assign all existing assets that have no portfolio yet
    // (portfolioId is non-nullable after migration, but may have been assigned in a previous run)
    const result = await db.userAsset.updateMany({
      where: { userId: user.id },
      data: { portfolioId },
    })

    console.log(
      `User ${user.id}: migrated ${result.count} assets to portfolio ${portfolioId}`,
    )
  }

  console.log('Migration complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
