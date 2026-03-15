import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})
const db = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  const user = await db.user.upsert({
    where: { telegramUserId: BigInt(123456789) },
    update: {},
    create: { telegramUserId: BigInt(123456789) },
  })

  console.log(`✅ Created user: ${user.id}`)

  await db.userAsset.upsert({
    where: { userId_symbol: { userId: user.id, symbol: 'USD' } },
    update: { quantity: 1000 },
    create: { userId: user.id, symbol: 'USD', quantity: 1000 },
  })

  await db.userAsset.upsert({
    where: { userId_symbol: { userId: user.id, symbol: 'BTC' } },
    update: { quantity: 0.01 },
    create: { userId: user.id, symbol: 'BTC', quantity: 0.01 },
  })

  console.log('✅ Created sample assets')

  await db.priceSnapshot.create({
    data: {
      data: {
        data: [
          {
            symbol: 'USD',
            name: 'دلار آمریکا',
            price: 890000,
            category: 'CURRENCY',
          },
          {
            symbol: 'BTC',
            name: 'بیت‌کوین',
            price: 4500000000,
            category: 'CRYPTOCURRENCY',
          },
        ],
      },
    },
  })

  console.log('✅ Created sample price snapshot')
  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
