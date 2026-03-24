import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { verifyCronAuth } from '@/server/cron/auth'

function resolveBaseUrl(): string {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
}

function webhookUnreachableWarning(baseUrl: string): string | undefined {
  try {
    const u = new URL(baseUrl)
    if (u.protocol !== 'https:') {
      return 'Webhook URL is not HTTPS. Telegram cannot reach http://localhost from the internet — use a deployed URL, a tunnel, or `pnpm bot:poll` for local dev.'
    }
  } catch {
    return 'NEXTAUTH_URL / base URL is not a valid URL.'
  }
  return undefined
}

/** Diagnostic: current Telegram webhook (same auth as POST). */
export async function GET(request: NextRequest): Promise<Response> {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN not configured' },
      { status: 500 },
    )
  }

  const baseUrl = resolveBaseUrl()
  const expectedWebhookUrl = `${baseUrl.replace(/\/$/, '')}/api/bot`

  const result = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`,
  )
  const telegram = await result.json()

  return NextResponse.json({
    expectedWebhookUrl,
    baseUrlWarning: webhookUnreachableWarning(baseUrl),
    telegram,
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  const auth = verifyCronAuth(request)
  if (!auth.authorized) return auth.response

  const token = process.env.TELEGRAM_BOT_TOKEN
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  const baseUrl = resolveBaseUrl()

  if (!token || !webhookSecret) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_WEBHOOK_SECRET not configured' },
      { status: 500 },
    )
  }

  const webhookUrl = `${baseUrl.replace(/\/$/, '')}/api/bot`
  const baseUrlWarning = webhookUnreachableWarning(baseUrl)

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
  return NextResponse.json({
    webhookUrl,
    baseUrlWarning,
    telegram: json,
  })
}
