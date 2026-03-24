/**
 * Local development: long-polling Telegram updates (no public URL required).
 * Deletes the bot webhook first so Telegram delivers updates via getUpdates.
 *
 * Usage: pnpm bot:poll
 * Requires .env / .env.local with TELEGRAM_BOT_TOKEN (and DB for session/user).
 *
 * Do not run alongside a working production webhook — use only for local dev.
 */
import { config as loadEnv } from 'dotenv'

import { createBot } from '@/bot/index'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

if (process.env.NODE_ENV === 'production') {
  console.error(
    '[bot:poll] Refusing to run in production. Use the /api/bot webhook instead.',
  )
  process.exit(1)
}

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('[bot:poll] TELEGRAM_BOT_TOKEN is not set.')
  process.exit(1)
}

async function main(): Promise<void> {
  const bot = createBot()

  await bot.api.deleteWebhook({ drop_pending_updates: false })
  console.info(
    '[bot:poll] Webhook cleared; starting long poll (Ctrl+C to stop).',
  )

  const stop = () => {
    void bot.stop()
    process.exit(0)
  }
  process.once('SIGINT', stop)
  process.once('SIGTERM', stop)

  await bot.start()
}

main().catch((err) => {
  console.error('[bot:poll] Fatal:', err)
  process.exit(1)
})
