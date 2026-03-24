import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { webhookCallback } from 'grammy'

import { createBot } from '@/bot/index'

export const runtime = 'nodejs'

export async function POST(request: NextRequest): Promise<Response> {
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn(
      '[bot/webhook] Unauthorized: X-Telegram-Bot-Api-Secret-Token missing or mismatch',
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const bot = createBot()
    const handler = webhookCallback(bot, 'std/http')
    return await handler(request)
  } catch (err) {
    console.error('[bot/webhook] Handler error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
