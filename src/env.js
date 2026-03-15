import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

import pkg from '../package.json' with { type: 'json' }

export const env = createEnv({
  server: {
    NEXT_PHASE: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']),

    NEXT_PUBLIC_VERSION: z.string(),

    // Database (Neon PostgreSQL)
    DATABASE_URL: z.url(),
    DIRECT_URL: z.url().optional(),

    // Auth
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.url().optional(),
    TELEGRAM_BOT_TOKEN: z.string().min(1),

    // Cron
    CRON_SECRET: z.string().min(1),

    NEXT_PUBLIC_ECOTRUST_API_URL: z.url(),
  },
  client: {
    NEXT_PUBLIC_ECOTRUST_API_URL: z.url(),
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1),

    NEXT_PUBLIC_VERSION: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,

    NEXT_PUBLIC_VERSION: (
      process.env.NEXT_PUBLIC_VERSION || pkg.version
    ).replace('v', ''),

    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,

    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,

    CRON_SECRET: process.env.CRON_SECRET,

    NEXT_PUBLIC_ECOTRUST_API_URL: process.env.NEXT_PUBLIC_ECOTRUST_API_URL,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
