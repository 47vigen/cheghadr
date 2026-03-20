import crypto from 'node:crypto'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function verifyCronAuth(
  request: NextRequest,
): { authorized: true } | { authorized: false; response: NextResponse } {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not configured')
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const expected = `Bearer ${cronSecret}`
  const authHeader = request.headers.get('authorization') ?? ''
  const a = Buffer.from(authHeader, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  const authorized = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!authorized) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  return { authorized: true }
}
