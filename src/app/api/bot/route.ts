import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { webhookCallback } from 'grammy'

import { createBot } from '@/bot/index'

export async function POST(request: NextRequest): Promise<Response> {
  const secret = request.headers.get('x-telegram-bot-api-secret-token')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const bot = createBot()
  const handler = webhookCallback(bot, 'std/http')
  return handler(request)
}
