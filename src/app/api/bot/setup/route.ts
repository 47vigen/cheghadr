import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifyCronAuth } from '@/server/cron/auth'

export async function POST(request: NextRequest): Promise<Response> {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  const token = process.env.TELEGRAM_BOT_TOKEN
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000')

  if (!token || !webhookSecret) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET not configured' },
      { status: 500 },
    )
  }

  const webhookUrl = `${baseUrl}/api/bot`

  const result = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: true,
      }),
    },
  )

  const json = await result.json()
  return NextResponse.json({ webhookUrl, telegram: json })
}
