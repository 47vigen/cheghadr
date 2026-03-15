import 'server-only'

import { headers } from 'next/headers'

import { createCaller } from '@/server/api/root'
import { createTRPCContext } from '@/server/api/trpc'

export const api = createCaller(async () => {
  const hdrs = await headers()
  return createTRPCContext({ headers: hdrs })
})
