import { defineConfig } from 'prisma/config'

// Prisma 7: migrate uses this URL. For Neon, point DATABASE_URL (or a dedicated
// migrate script) at the unpooled/direct connection when needed.
export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
