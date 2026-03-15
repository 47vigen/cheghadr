import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

import pkg from '../package.json' with { type: 'json' }

export const env = createEnv({
  server: {
    NEXT_PHASE: z.string().optional(),
    NODE_ENV: z.enum(['development', 'test', 'production']),

    NEXT_PUBLIC_VERSION: z.string(),

    NEXT_PUBLIC_ECOTRUST_API_URL: z.url(),
  },
  client: {
    NEXT_PUBLIC_ECOTRUST_API_URL: z.url(),

    NEXT_PUBLIC_VERSION: z.string(),
  },
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PHASE: process.env.NEXT_PHASE,

    NEXT_PUBLIC_VERSION: (
      process.env.NEXT_PUBLIC_VERSION || pkg.version
    ).replace('v', ''),

    NEXT_PUBLIC_ECOTRUST_API_URL: process.env.NEXT_PUBLIC_ECOTRUST_API_URL,
  },

  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
})
